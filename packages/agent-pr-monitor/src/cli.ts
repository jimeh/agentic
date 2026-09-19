import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createClient, observe } from "./github";
import { monitor } from "./monitor";
import type { Target } from "./model";
import {
  conditionNames,
  validateGoal,
  type Goal,
  type ConditionName,
} from "./goals";
import { monitorGoal } from "./goal-monitor";
import { observeGoal } from "./goal-observation";

const help = `Usage: agent-pr-monitor <snapshot|wait|evaluate> <https://HOST/OWNER/REPO/pull/NUMBER> [options]

  snapshot            Observe the PR now and establish a baseline
  wait                Stay quiet until a meaningful change, timeout, or error

  evaluate            Observe once and evaluate --until conditions; no cursor writes

  --until CONDITION       Repeat to require all conditions:
                          checks-finished, checks-pass, review-finished,
                          review-approved, threads-resolved, feedback-received,
                          non-draft, mergeable, merged, closed
  --checks SCOPE          required (default), all, or repeat exact check names
  --reviewer LOGIN        Reviewer for review conditions; optional feedback filter
  --review-status STATUS  complete or approved; adds the corresponding condition
  --since ISO_TIMESTAMP   Only feedback/review evidence newer than this time
  --head SHA              Pin to a full commit SHA (otherwise first observation)
  --ignore-outdated       Exclude outdated threads from threads-resolved

  --state-file PATH        Durable cursor (default: XDG_STATE_HOME or
                           ~/.local/state, under
                           agentic/pr-monitor/HOST/OWNER/REPO/NUMBER.json)
  --interval SECONDS       Poll interval, at least 15 (default: 60)
  --initial-delay SECONDS  Wait this long before the first poll of a wait
                           (default: 0); counts toward the timeout
  --timeout SECONDS        Maximum runtime, 1..86400 (default: 1800)
  --help, -h               Show help

With no baseline, wait returns an initial snapshot. Reuse the state file for
subsequent waits. Output is one JSON result with a run ID, observed head SHA,
summary, and private artifact paths. It never authorizes readiness or merging.
Exit codes: 0 snapshot/change, 2 timeout, 1 error, 130 SIGINT, 143 SIGTERM.
Each poll is one GraphQL request per 100 checks, reviews, comments, or threads.
Auth: GH_TOKEN/GITHUB_TOKEN for github.com; GH_ENTERPRISE_TOKEN or
GITHUB_ENTERPRISE_TOKEN for other hosts; otherwise gh auth token --hostname HOST.
Goal evaluate/wait never touch the change cursor. evaluate emits satisfied
true/false/null (unknown); exit 0 met, 3 not met, 4 unknown. Goal wait exits 0
on goal_reached, 3 on attention_required or head_changed, 2 timeout, 1 error.
Checks-pass requires SUCCESS, not SKIPPED or NEUTRAL. No selected checks is
unknown. Review completion and approval require submitted current-head GitHub metadata.
Required-check discovery includes branch protection and active rulesets.
The monitor only reads GitHub. Tokens and comment bodies are never persisted.`;

export function parseTarget(input: string): Target {
  const url = new URL(input);
  const match =
    /^\/([A-Za-z0-9][A-Za-z0-9-]*)\/([A-Za-z0-9_.-]+)\/pull\/([1-9][0-9]*)\/?$/.exec(
      url.pathname,
    );
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !match ||
    [".", ".."].includes(match[2]) ||
    !Number.isSafeInteger(Number(match[3]))
  ) {
    throw new Error(
      "Expected an HTTPS GitHub pull request URL without credentials or a port",
    );
  }
  return {
    host: url.hostname.toLowerCase(),
    owner: match[1].toLowerCase(),
    repo: match[2].toLowerCase(),
    number: Number(match[3]),
  };
}

async function tokenFor(target: Target): Promise<string> {
  const token =
    target.host === "github.com"
      ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN
      : process.env.GH_ENTERPRISE_TOKEN || process.env.GITHUB_ENTERPRISE_TOKEN;
  if (token?.trim()) return token.trim();
  let result;
  try {
    result = Bun.spawnSync(["gh", "auth", "token", "--hostname", target.host], {
      stdout: "pipe",
      stderr: "pipe",
      timeout: 15_000,
    });
  } catch {
    throw new Error(
      "No token available and gh could not run. Set the appropriate token environment variable or authenticate gh for this host.",
    );
  }
  const value = result.stdout.toString().trim();
  if (result.exitCode !== 0 || !value)
    throw new Error(
      "Could not obtain a token. Set the appropriate token environment variable or authenticate gh for this host.",
    );
  return value;
}

function seconds(
  value: string | undefined,
  fallback: number,
  minimum: number,
): number {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > 86400) {
    throw new Error(`Expected whole seconds between ${minimum} and 86400`);
  }
  return number * 1000;
}

export async function main(args: string[]): Promise<number> {
  const controller = new AbortController();
  let signalExit = 130;
  const onInt = () => {
    signalExit = 130;
    controller.abort();
  };
  const onTerm = () => {
    signalExit = 143;
    controller.abort();
  };
  process.on("SIGINT", onInt);
  process.on("SIGTERM", onTerm);
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        help: { type: "boolean", short: "h" },
        until: { type: "string", multiple: true },
        checks: { type: "string", multiple: true },
        reviewer: { type: "string" },
        "review-status": { type: "string" },
        since: { type: "string" },
        head: { type: "string" },
        "ignore-outdated": { type: "boolean" },
        "state-file": { type: "string" },
        interval: { type: "string" },
        "initial-delay": { type: "string" },
        timeout: { type: "string" },
      },
    });
    if (values.help) {
      console.log(help);
      return 0;
    }
    const [mode, url] = positionals;
    if (
      (mode !== "snapshot" && mode !== "wait" && mode !== "evaluate") ||
      !url ||
      positionals.length !== 2
    ) {
      throw new Error(help);
    }
    const target = parseTarget(url);
    const intervalMs = seconds(values.interval, 60, 15);
    const initialDelayMs = seconds(values["initial-delay"], 0, 0);
    const timeoutMs = seconds(values.timeout, 1800, 1);
    const stateFile = resolve(
      values["state-file"] ??
        join(
          process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
          "agentic",
          "pr-monitor",
          target.host,
          target.owner,
          target.repo,
          `${target.number}.json`,
        ),
    );
    const conditions = [...(values.until ?? [])];
    if (values["review-status"]) {
      if (!["complete", "approved"].includes(values["review-status"]))
        throw new Error("--review-status must be complete or approved");
      conditions.push(
        values["review-status"] === "complete"
          ? "review-finished"
          : "review-approved",
      );
    }
    const goalMode = mode === "evaluate" || conditions.length > 0;
    if (
      !goalMode &&
      [
        values.checks,
        values.reviewer,
        values.since,
        values.head,
        values["ignore-outdated"],
      ].some((v) => v !== undefined)
    )
      throw new Error("Goal options require evaluate or wait --until");
    if (goalMode && mode === "snapshot")
      throw new Error("Use evaluate for a one-shot goal probe");
    if (mode === "evaluate" && initialDelayMs)
      throw new Error("evaluate does not accept an initial delay");
    const scopes = values.checks ?? ["required"];
    if (
      scopes.length > 1 &&
      scopes.some((v) => ["all", "required"].includes(v))
    )
      throw new Error("Do not mix required/all scopes with named checks");
    const goal: Goal = {
      conditions: [...new Set(conditions)] as ConditionName[],
      checks:
        scopes.length === 1 && ["required", "all"].includes(scopes[0])
          ? (scopes[0] as "required" | "all")
          : scopes,
      reviewer: values.reviewer,
      since: values.since,
      head: values.head?.toLowerCase(),
      ignoreOutdated: values["ignore-outdated"] ?? false,
    };
    if (goalMode) {
      if (conditions.some((c) => !conditionNames.includes(c as ConditionName)))
        throw new Error("Unsupported --until condition; see --help");
      validateGoal(goal);
    }
    const client = createClient(target, await tokenFor(target));
    if (goalMode) {
      const result = await monitorGoal({
        mode: mode === "evaluate" ? "evaluate" : "wait",
        goal,
        intervalMs,
        timeoutMs,
        initialDelayMs,
        signal: controller.signal,
        observe: (signal) =>
          observeGoal(
            client,
            target,
            goal.checks === "required" &&
              goal.conditions.some((c) => c.startsWith("checks-")),
            signal,
          ),
      });
      console.log(JSON.stringify(result));
      if (result.kind === "error") return 1;
      if (result.kind === "timeout") return 2;
      if (result.kind === "stopped") return signalExit;
      if (
        result.kind === "head_changed" ||
        result.kind === "attention_required"
      )
        return 3;
      return result.satisfied === null ? 4 : result.satisfied ? 0 : 3;
    }
    const result = await monitor({
      target,
      stateFile,
      mode: mode as "snapshot" | "wait",
      intervalMs,
      initialDelayMs,
      timeoutMs,
      signal: controller.signal,
      observe: (signal) => observe(client, target, { signal }),
    });
    console.log(JSON.stringify(result));
    return result.kind === "error"
      ? 1
      : result.kind === "timeout"
        ? 2
        : result.kind === "stopped"
          ? signalExit
          : 0;
  } catch (error) {
    console.error(
      `agent-pr-monitor: ${error instanceof Error ? error.message : "Unexpected failure"}`,
    );
    return 1;
  } finally {
    process.off("SIGINT", onInt);
    process.off("SIGTERM", onTerm);
  }
}
