import { parseArgs } from "node:util";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createClient, observe } from "./github";
import { monitor } from "./monitor";
import type { Target } from "./model";

const help = `Usage: agent-pr-monitor <snapshot|wait> <https://HOST/OWNER/REPO/pull/NUMBER> [options]

  snapshot            Observe the PR now and establish a baseline
  wait                Stay quiet until a meaningful change, timeout, or error

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
      (mode !== "snapshot" && mode !== "wait") ||
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
    const client = createClient(target, await tokenFor(target));
    const result = await monitor({
      target,
      stateFile,
      mode,
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
