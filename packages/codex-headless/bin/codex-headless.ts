#!/usr/bin/env bun

import {
  attachedValue,
  optionName,
  parseHeartbeatSeconds,
  rejectReserved,
  runHeadless,
  splitPassthrough,
  takeValue,
  usageExit,
} from "@jimeh/agent-headless";
import type { ArtifactPaths, EventContext } from "@jimeh/agent-headless";
import { readFileSync } from "node:fs";

type Mode = "exec" | "resume" | "review";

type Options = {
  artifactDir?: string;
  effort?: string;
  ephemeral: boolean;
  heartbeatSeconds: number;
  mode: Mode;
  model?: string;
  passthrough: string[];
  resume?: string;
  sandbox: string;
};

const sandboxModes = ["read-only", "workspace-write", "danger-full-access"];

// `codex exec resume` and `codex exec review` accept neither `-s` nor `-C`, so
// the runner sets the sandbox through config and always runs from the target
// checkout. Keys listed here are rejected when passed through `-c`.
const reservedConfigKeys = new Set([
  "model",
  "model_reasoning_effort",
  "sandbox_mode",
]);

const reservedCodexOptions = new Set([
  "-C",
  "-m",
  "-o",
  "-s",
  "--approve-for-me",
  "--cd",
  "--dangerously-bypass-approvals-and-sandbox",
  "--dangerously-bypass-hook-trust",
  "--ephemeral",
  "--json",
  "--last",
  "--model",
  "--output-last-message",
  "--sandbox",
  "--yolo",
]);

// Plain `codex exec` accepts these; `resume` and `review` reject them.
const execOnlyOptions = new Set(["--add-dir"]);

// Review scope flags reject a prompt argument, so the runner only appends the
// stdin marker when none of them is present.
const reviewScopeOptions = new Set(["--base", "--commit", "--uncommitted"]);

function usage(exitCode = 2): never {
  usageExit(
    [
      "Usage: codex-headless [options] [-- <extra codex arguments>]",
      "",
      "Options:",
      "  --artifact-dir <path>     Store run artifacts here",
      "  --sandbox <mode>          read-only (default), workspace-write, or",
      "                            danger-full-access",
      "  --model <name>            Codex model (default: Codex config)",
      "  --effort <level>          Reasoning effort (default: Codex config)",
      "  --resume <session-id>     Resume a persisted session",
      "  --review                  Run `codex exec review`; scope flags such as",
      "                            --uncommitted or --base go after --",
      "  --ephemeral               Do not persist the session",
      "  --heartbeat-seconds <n>   Quiet-stream heartbeat interval (default: 30)",
      "  --help, -h                Show this help",
      "",
      "The prompt is read from stdin. Codex runs from the current directory; on",
      "a fresh run, pass --add-dir after -- for extra writable paths (resume and",
      "review do not accept it). The artifact path and concise progress are",
      "written to stderr. The raw stream is written only to events.ndjson.",
    ],
    exitCode,
  );
}

function rejectReservedConfig(passthrough: string[]): void {
  for (let index = 0; index < passthrough.length; index += 1) {
    const arg = passthrough[index];
    let value: string | undefined;
    if (arg === "-c" || arg === "--config") {
      value = passthrough[index + 1];
      index += 1;
    } else if (arg.startsWith("--config=")) {
      value = arg.slice(arg.indexOf("=") + 1);
    } else if (optionName(arg) === "-c") {
      value = attachedValue(arg);
    }
    if (value === undefined) {
      continue;
    }
    const key = value.includes("=")
      ? value.slice(0, value.indexOf("="))
      : value;
    if (reservedConfigKeys.has(key.trim())) {
      throw new Error(
        `runner-owned Codex config key cannot follow --: ${key.trim()}`,
      );
    }
  }
}

function parseArgs(argv: string[]): Options {
  const { own, passthrough } = splitPassthrough(argv);
  const options: Options = {
    ephemeral: false,
    heartbeatSeconds: 30,
    mode: "exec",
    passthrough,
    sandbox: "read-only",
  };

  for (let index = 0; index < own.length; index += 1) {
    const arg = own[index];

    if (arg === "--help" || arg === "-h") {
      usage(0);
    }

    const valueOptions: Record<string, keyof Options> = {
      "--artifact-dir": "artifactDir",
      "--effort": "effort",
      "--model": "model",
      "--resume": "resume",
      "--sandbox": "sandbox",
    };
    const key = valueOptions[arg];
    if (key) {
      const value = takeValue(own, index, arg);
      (options[key] as string | undefined) = value;
      index += 1;
      continue;
    }

    if (arg === "--heartbeat-seconds") {
      options.heartbeatSeconds = parseHeartbeatSeconds(
        takeValue(own, index, arg),
      );
      index += 1;
      continue;
    }

    if (arg === "--review") {
      options.mode = "review";
      continue;
    }

    if (arg === "--ephemeral") {
      options.ephemeral = true;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (options.resume) {
    if (options.mode === "review") {
      throw new Error("--resume and --review cannot be used together");
    }
    options.mode = "resume";
  }

  if (!sandboxModes.includes(options.sandbox)) {
    throw new Error(
      `--sandbox must be one of ${sandboxModes.join(", ")}: ${options.sandbox}`,
    );
  }

  rejectReserved(passthrough, reservedCodexOptions, "Codex");
  rejectReservedConfig(passthrough);
  if (options.mode !== "exec") {
    for (const arg of passthrough) {
      const name = optionName(arg);
      if (execOnlyOptions.has(name)) {
        throw new Error(
          `codex exec ${options.mode} does not accept ${name}; pass it only on a fresh run`,
        );
      }
    }
  }

  return options;
}

function hasReviewScope(passthrough: string[]): boolean {
  return passthrough.some((arg) => reviewScopeOptions.has(optionName(arg)));
}

function buildCommand(options: Options, paths: ArtifactPaths): string[] {
  const args = ["codex", "exec"];
  if (options.mode !== "exec") {
    args.push(options.mode);
  }
  args.push(
    "--json",
    "-o",
    paths.result,
    "-c",
    `sandbox_mode="${options.sandbox}"`,
  );
  if (options.model) {
    args.push("-m", options.model);
  }
  if (options.effort) {
    args.push("-c", `model_reasoning_effort="${options.effort}"`);
  }
  if (options.ephemeral) {
    args.push("--ephemeral");
  }
  args.push(...options.passthrough);
  if (options.mode === "resume" && options.resume) {
    args.push(options.resume);
  }
  if (options.mode !== "review" || !hasReviewScope(options.passthrough)) {
    args.push("-");
  }
  return args;
}

function itemOf(event: Record<string, unknown>): Record<string, unknown> {
  const item = event.item;
  return item && typeof item === "object"
    ? (item as Record<string, unknown>)
    : {};
}

function errorMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const message = (value as Record<string, unknown>).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "unknown error";
}

function truncate(text: string, limit = 200): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

async function main(): Promise<number> {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`codex-headless: ${message}\n`);
    return 2;
  }

  const metadata: Record<string, unknown> = {
    ephemeral: options.ephemeral,
    mode: options.mode,
    requestedEffort: options.effort,
    requestedModel: options.model,
    sandbox: options.sandbox,
    usage: undefined,
  };
  let resultPath: string | undefined;
  // A top-level `error` event is fatal only when no `turn.completed` follows;
  // Codex also emits it for recoverable stream problems.
  let pendingError: string | undefined;

  // Progress lines carry item types and statuses only. Command text, command
  // output, agent messages, and reasoning stay in events.ndjson; error messages
  // are the exception because they are the only useful failure diagnostic.
  const onEvent = (
    event: Record<string, unknown>,
    context: EventContext,
  ): string[] => {
    const type = typeof event.type === "string" ? event.type : "unknown";

    if (type === "thread.started") {
      const thread =
        typeof event.thread_id === "string" ? event.thread_id : "unknown";
      if (typeof event.thread_id === "string") {
        context.setSessionId(event.thread_id);
      }
      return [`session ${thread} started`];
    }

    if (type === "turn.started") {
      return ["turn started"];
    }

    if (type === "turn.completed") {
      pendingError = undefined;
      if (event.usage && typeof event.usage === "object") {
        metadata.usage = event.usage;
      }
      return ["turn completed"];
    }

    if (type === "turn.failed") {
      pendingError = undefined;
      const message = truncate(errorMessage(event.error));
      context.setResultError(`Codex turn failed: ${message}`);
      return [`error: ${message}`];
    }

    if (type === "error") {
      const message = truncate(errorMessage(event.message ?? event.error));
      pendingError = `Codex reported an error: ${message}`;
      return [`error: ${message}`];
    }

    if (type === "item.started" || type === "item.completed") {
      const item = itemOf(event);
      const itemType = typeof item.type === "string" ? item.type : "item";
      if (itemType === "error") {
        const message = truncate(errorMessage(item.message));
        return [`error: ${message}`];
      }
      const status = type === "item.started" ? "started" : "completed";
      const exit =
        type === "item.completed" && typeof item.exit_code === "number"
          ? ` (exit ${item.exit_code})`
          : "";
      return [`${itemType} ${status}${exit}`];
    }

    return [];
  };

  return runHeadless({
    agent: "codex-headless",
    artifactDir: options.artifactDir,
    command: (paths) => {
      resultPath = paths.result;
      return buildCommand(options, paths);
    },
    displayName: "Codex",
    emptyResultError: "Codex exited without writing a result",
    finalize: (context) => {
      if (pendingError) {
        context.setResultError(pendingError);
      }
      if (!resultPath) {
        return;
      }
      try {
        context.setResult(readFileSync(resultPath, "utf8"));
      } catch {
        // Codex never writes the -o file on failure; the exit policy reports it.
      }
    },
    heartbeatSeconds: options.heartbeatSeconds,
    metadata,
    onEvent,
    startMessage: `starting codex exec${options.mode === "exec" ? "" : ` ${options.mode}`} with ${options.sandbox} sandbox`,
  });
}

process.exit(await main());
