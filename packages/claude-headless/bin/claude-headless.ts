#!/usr/bin/env bun

import {
  optionValues,
  parseHeartbeatSeconds,
  rejectReserved,
  runHeadless,
  splitPassthrough,
  takeValue,
  usageExit,
} from "@jimeh/agent-headless";
import type { EventContext } from "@jimeh/agent-headless";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

type Options = {
  artifactDir?: string;
  effort?: string;
  heartbeatSeconds: number;
  model: string;
  passthrough: string[];
  permissionMode: string;
  resume?: string;
  sessionId?: string;
  settingSources: string;
};

type ModelSelection = {
  effort?: string;
  model: string;
  requestedModel: string;
};

const managedCodexSkills = [
  "codex-analysis",
  "codex-computer-use",
  "codex-first",
  "codex-implementation",
  "codex-review",
];

const reservedClaudeOptions = new Set([
  "-c",
  "-p",
  "-r",
  "--allow-dangerously-skip-permissions",
  "--bare",
  "--cloud",
  "--continue",
  "--dangerously-skip-permissions",
  "--disable-slash-commands",
  "--disallowed-tools",
  "--print",
  "--effort",
  "--input-format",
  "--model",
  "--no-session-persistence",
  "--output-format",
  "--permission-mode",
  "--resume",
  "--safe-mode",
  "--session-id",
  "--settings",
  "--setting-sources",
  "--verbose",
]);

function usage(exitCode = 2): never {
  usageExit(
    [
      "Usage: claude-headless [options] [-- <extra claude arguments>]",
      "",
      "Options:",
      "  --artifact-dir <path>       Store run artifacts here",
      "  --model <name>              fable (Fable 5.1) by default; opus pins Opus 5",
      "  --effort <level>            Override the model-family default",
      "  --setting-sources <sources> Claude setting sources (default: user)",
      "  --permission-mode <mode>    Claude permission mode (default: plan)",
      "  --session-id <uuid>         Persist a new session with this ID",
      "  --resume <session-id>       Resume a persisted session",
      "  --heartbeat-seconds <n>     Quiet-stream heartbeat interval (default: 30)",
      "  --help, -h                  Show this help",
      "",
      "The prompt is read from stdin. The artifact path and concise progress are",
      "written to stderr. The raw stream is written only to events.ndjson.",
    ],
    exitCode,
  );
}

function parseArgs(argv: string[]): Options {
  const { own, passthrough } = splitPassthrough(argv);
  const options: Options = {
    heartbeatSeconds: 30,
    model: "fable",
    passthrough,
    permissionMode: "plan",
    settingSources: "user",
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
      "--permission-mode": "permissionMode",
      "--resume": "resume",
      "--session-id": "sessionId",
      "--setting-sources": "settingSources",
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

    throw new Error(`unknown option: ${arg}`);
  }

  if (options.resume && options.sessionId) {
    throw new Error("--resume and --session-id cannot be used together");
  }

  rejectReserved(passthrough, reservedClaudeOptions, "Claude");

  return options;
}

// Friendly names and full IDs the runner routes explicitly. Claude CLI's own
// `fable` alias may lag behind the newest release, so the mapping stays here.
const KNOWN_MODELS: Record<string, { effort: string; model: string }> = {
  "claude-fable-5-1": { effort: "high", model: "claude-fable-5-1" },
  "claude-opus-5": { effort: "medium", model: "claude-opus-5" },
  fable: { effort: "high", model: "claude-fable-5-1" },
  "fable-5-1": { effort: "high", model: "claude-fable-5-1" },
  opus: { effort: "medium", model: "claude-opus-5" },
  "opus-5": { effort: "medium", model: "claude-opus-5" },
};

function selectModel(requestedModel: string, effort?: string): ModelSelection {
  const normalized = requestedModel.toLowerCase();

  const known = Object.hasOwn(KNOWN_MODELS, normalized)
    ? KNOWN_MODELS[normalized]
    : undefined;
  if (!known) {
    return { effort, model: requestedModel, requestedModel };
  }

  return {
    effort: effort ?? known.effort,
    model: known.model,
    requestedModel,
  };
}

function projectSkillDirs(directory: string): string[] {
  const skillDirs: string[] = [];
  let current = resolve(directory);

  while (true) {
    skillDirs.push(join(current, ".claude", "skills"));
    const parent = dirname(current);
    if (parent === current) {
      return skillDirs;
    }
    current = parent;
  }
}

function pluginCodexSkillNames(directory: string): string[] {
  try {
    const pluginDir = resolve(directory);
    const manifest = JSON.parse(
      readFileSync(join(pluginDir, ".claude-plugin", "plugin.json"), "utf8"),
    ) as { name?: unknown };
    if (typeof manifest.name !== "string") {
      return [];
    }

    const names: string[] = [];
    for (const entry of readdirSync(join(pluginDir, "skills"), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const skillFile = join(pluginDir, "skills", entry.name, "SKILL.md");
      let skillSource: string;
      try {
        skillSource = readFileSync(skillFile, "utf8");
      } catch {
        continue;
      }
      const frontmatter = skillSource.match(
        /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
      )?.[1];
      const declaredName = frontmatter
        ?.match(/^name:\s*([^\s#]+)\s*$/m)?.[1]
        ?.replace(/^['"]|['"]$/g, "");
      const skillName = declaredName || entry.name;
      if (skillName.startsWith("codex-")) {
        names.push(`${manifest.name}:${skillName}`);
      }
    }

    return names;
  } catch {
    return [];
  }
}

function codexSkillNames(passthrough: string[]): string[] {
  const names = new Set(managedCodexSkills);
  const skillDirs = [
    join(homedir(), ".claude", "skills"),
    ...projectSkillDirs(process.cwd()),
  ];

  for (const directory of optionValues(passthrough, "--add-dir", true)) {
    skillDirs.push(...projectSkillDirs(directory));
  }
  for (const directory of optionValues(passthrough, "--plugin-dir")) {
    for (const name of pluginCodexSkillNames(directory)) {
      names.add(name);
    }
  }

  for (const skillsDir of new Set(skillDirs)) {
    try {
      for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
        if (entry.name.startsWith("codex-")) {
          names.add(entry.name);
        }
      }
    } catch {
      // Managed names still protect fresh or partially installed setups.
    }
  }

  return [...names].sort();
}

function contentBlocks(event: Record<string, unknown>): unknown[] {
  const message = event.message;
  if (!message || typeof message !== "object") {
    return [];
  }
  const content = (message as Record<string, unknown>).content;
  return Array.isArray(content) ? content : [];
}

function describeEvent(event: Record<string, unknown>): string[] {
  const type = typeof event.type === "string" ? event.type : "unknown";

  if (type === "system") {
    const subtype =
      typeof event.subtype === "string" ? event.subtype : "update";
    if (subtype === "init") {
      const session =
        typeof event.session_id === "string" ? event.session_id : "unknown";
      return [`session ${session} started`];
    }
    return [`system ${subtype}`];
  }

  if (type === "assistant") {
    const tools = contentBlocks(event).flatMap((block) => {
      if (!block || typeof block !== "object") {
        return [];
      }
      const item = block as Record<string, unknown>;
      return item.type === "tool_use" && typeof item.name === "string"
        ? [`tool ${item.name}`]
        : [];
    });
    if (tools.length > 0) {
      return tools;
    }
    return ["assistant update"];
  }

  if (type === "user") {
    const hasToolResult = contentBlocks(event).some(
      (block) =>
        block &&
        typeof block === "object" &&
        (block as Record<string, unknown>).type === "tool_result",
    );
    return hasToolResult ? ["tool result received"] : [];
  }

  if (type === "progress") {
    const tool =
      typeof event.tool_name === "string" ? ` ${event.tool_name}` : "";
    return [`progress${tool}`];
  }

  if (type === "rate_limit_event") {
    return ["rate limit update"];
  }

  if (type === "result") {
    const subtype =
      typeof event.subtype === "string" ? ` ${event.subtype}` : "";
    return [`completed${subtype}`];
  }

  return [];
}

async function main(): Promise<number> {
  let options: Options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`claude-headless: ${message}\n`);
    return 2;
  }

  const selection = selectModel(options.model, options.effort);
  const blockedSkills = codexSkillNames(options.passthrough);
  const claudeArgs = [
    "claude",
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    selection.model,
    "--setting-sources",
    options.settingSources,
    "--permission-mode",
    options.permissionMode,
    "--settings",
    JSON.stringify({
      skillOverrides: Object.fromEntries(
        blockedSkills.map((skill) => [skill, "off"]),
      ),
    }),
    "--disallowed-tools",
    ...blockedSkills.map((skill) => `Skill(${skill})`),
  ];
  if (selection.effort) {
    claudeArgs.push("--effort", selection.effort);
  }
  if (options.resume) {
    claudeArgs.push("--resume", options.resume);
  } else if (options.sessionId) {
    claudeArgs.push("--session-id", options.sessionId);
  } else {
    claudeArgs.push("--no-session-persistence");
  }
  claudeArgs.push(...options.passthrough);

  const actualModels = new Set<string>();
  const metadata: Record<string, unknown> = {
    actualModels: [],
    effectiveEffort: selection.effort,
    effectiveModel: selection.model,
    permissionMode: options.permissionMode,
    requestedEffort: options.effort,
    requestedModel: selection.requestedModel,
    settingSources: options.settingSources,
  };

  const onEvent = (
    event: Record<string, unknown>,
    context: EventContext,
  ): string[] => {
    if (event.type === "system" && event.subtype === "init") {
      if (typeof event.session_id === "string") {
        context.setSessionId(event.session_id);
      }
    }

    if (event.type === "result") {
      if (typeof event.result === "string") {
        context.setResult(event.result);
      }
      if (typeof event.session_id === "string") {
        context.setSessionId(event.session_id);
      }
      if (event.modelUsage && typeof event.modelUsage === "object") {
        for (const model of Object.keys(event.modelUsage)) {
          actualModels.add(model);
        }
      }
      if (
        event.is_error === true ||
        (typeof event.subtype === "string" && event.subtype !== "success")
      ) {
        const subtype =
          typeof event.subtype === "string" ? event.subtype : "error";
        context.setResultError(`Claude result reported ${subtype}`);
      }
    }

    return describeEvent(event);
  };

  return runHeadless({
    agent: "claude-headless",
    artifactDir: options.artifactDir,
    command: () => claudeArgs,
    displayName: "Claude",
    emptyResultError: "Claude stream ended without a nonempty result event",
    finalize: () => {
      metadata.actualModels = [...actualModels].sort();
    },
    heartbeatSeconds: options.heartbeatSeconds,
    metadata,
    onEvent,
    startMessage: `starting ${selection.model}${selection.effort ? ` at ${selection.effort} effort` : ""}`,
  });
}

process.exit(await main());
