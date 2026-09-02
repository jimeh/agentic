#!/usr/bin/env bun

import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
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

type RunMetadata = {
  actualModels: string[];
  artifactDir: string;
  cwd: string;
  effectiveEffort?: string;
  effectiveModel: string;
  endedAt?: string;
  error?: string;
  exitCode?: number;
  malformedEvents: number;
  permissionMode: string;
  pid?: number;
  requestedEffort?: string;
  requestedModel: string;
  schemaVersion: 1;
  sessionId?: string;
  settingSources: string;
  startedAt: string;
  status: "failed" | "interrupted" | "running" | "succeeded";
};

const managedFiles = [
  "events.ndjson",
  "progress.log",
  "result.md",
  "run.json",
  "stderr.log",
];

const managedCodexSkills = [
  "codex-analysis",
  "codex-computer-use",
  "codex-first",
  "codex-implementation",
  "codex-review",
];

function usage(exitCode = 2): never {
  const output = exitCode === 0 ? process.stdout : process.stderr;
  output.write(
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
      "",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function takeValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    heartbeatSeconds: 30,
    model: "fable",
    passthrough: [],
    permissionMode: "plan",
    settingSources: "user",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      options.passthrough = args.slice(index + 1);
      break;
    }

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
      const value = takeValue(args, index, arg);
      (options[key] as string | undefined) = value;
      index += 1;
      continue;
    }

    if (arg === "--heartbeat-seconds") {
      const value = takeValue(args, index, arg);
      const seconds = Number(value);
      if (!Number.isFinite(seconds) || seconds <= 0) {
        throw new Error("--heartbeat-seconds must be greater than zero");
      }
      options.heartbeatSeconds = seconds;
      index += 1;
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  if (options.resume && options.sessionId) {
    throw new Error("--resume and --session-id cannot be used together");
  }

  const reserved = new Set([
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
  for (const arg of options.passthrough) {
    const name = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (reserved.has(name)) {
      throw new Error(`runner-owned Claude option cannot follow --: ${name}`);
    }
  }

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

  const known = KNOWN_MODELS[normalized];
  if (!known) {
    return { effort, model: requestedModel, requestedModel };
  }

  return {
    effort: effort ?? known.effort,
    model: known.model,
    requestedModel,
  };
}

function optionValues(
  args: string[],
  option: string,
  variadic = false,
): string[] {
  const values: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith(`${option}=`)) {
      values.push(arg.slice(option.length + 1));
      continue;
    }
    if (arg !== option) {
      continue;
    }

    while (args[index + 1] && !args[index + 1].startsWith("-")) {
      values.push(args[index + 1]);
      index += 1;
      if (!variadic) {
        break;
      }
    }
  }

  return values;
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

function createArtifactDir(requested?: string): string {
  const artifactDir = requested
    ? resolve(requested)
    : mkdtempSync(join(tmpdir(), "claude-headless."));

  mkdirSync(artifactDir, { mode: 0o700, recursive: true });
  chmodSync(artifactDir, 0o700);

  for (const filename of managedFiles) {
    const path = join(artifactDir, filename);
    if (existsSync(path)) {
      throw new Error(`refusing to overwrite managed artifact: ${path}`);
    }
  }

  return artifactDir;
}

function createPrivateFile(path: string): number {
  const descriptor = openSync(path, "wx", 0o600);
  chmodSync(path, 0o600);
  return descriptor;
}

function writeMetadata(path: string, metadata: RunMetadata): void {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(metadata, null, 2)}\n`, {
    mode: 0o600,
  });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
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

async function drainStream(
  stream: ReadableStream<Uint8Array>,
  descriptor: number,
): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      writeSync(descriptor, value);
    }
  } finally {
    reader.releaseLock();
  }
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
  let artifactDir: string;
  try {
    artifactDir = createArtifactDir(options.artifactDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`claude-headless: ${message}\n`);
    return 2;
  }

  const eventsPath = join(artifactDir, "events.ndjson");
  const progressPath = join(artifactDir, "progress.log");
  const resultPath = join(artifactDir, "result.md");
  const runPath = join(artifactDir, "run.json");
  const stderrPath = join(artifactDir, "stderr.log");
  const eventsDescriptor = createPrivateFile(eventsPath);
  const progressDescriptor = createPrivateFile(progressPath);
  const stderrDescriptor = createPrivateFile(stderrPath);
  closeSync(createPrivateFile(resultPath));

  const metadata: RunMetadata = {
    actualModels: [],
    artifactDir,
    cwd: process.cwd(),
    effectiveEffort: selection.effort,
    effectiveModel: selection.model,
    malformedEvents: 0,
    permissionMode: options.permissionMode,
    requestedEffort: options.effort,
    requestedModel: selection.requestedModel,
    schemaVersion: 1,
    settingSources: options.settingSources,
    startedAt: new Date().toISOString(),
    status: "running",
  };

  process.stderr.write(`claude-headless: artifacts: ${artifactDir}\n`);

  let lastProgressAt = Date.now();
  let lastProgress = "starting Claude";
  const progress = (message: string, activity = true): void => {
    const timestamp = new Date().toISOString();
    const line = `${timestamp}\t${message}\n`;
    writeSync(progressDescriptor, line);
    process.stderr.write(`claude-headless: ${message}\n`);
    if (activity) {
      lastProgressAt = Date.now();
      lastProgress = message;
    }
  };

  progress(
    `starting ${selection.model}${selection.effort ? ` at ${selection.effort} effort` : ""}`,
  );

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

  let child: ReturnType<typeof Bun.spawn>;
  try {
    child = Bun.spawn(claudeArgs, {
      stderr: "pipe",
      stdin: "inherit",
      stdout: "pipe",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    metadata.endedAt = new Date().toISOString();
    metadata.error = message;
    metadata.exitCode = 127;
    metadata.status = "failed";
    writeMetadata(runPath, metadata);
    progress(`failed to start Claude: ${message}`);
    closeSync(eventsDescriptor);
    closeSync(progressDescriptor);
    closeSync(stderrDescriptor);
    return 127;
  }

  metadata.pid = child.pid;
  writeMetadata(runPath, metadata);
  const childStdout = child.stdout as ReadableStream<Uint8Array>;
  const childStderr = child.stderr as ReadableStream<Uint8Array>;

  let interruptedSignal: NodeJS.Signals | undefined;
  const forwardSignal = (signal: NodeJS.Signals): void => {
    interruptedSignal = signal;
    progress(`forwarding ${signal} to Claude`);
    child.kill(signal);
  };
  const sigint = (): void => forwardSignal("SIGINT");
  const sigterm = (): void => forwardSignal("SIGTERM");
  process.on("SIGINT", sigint);
  process.on("SIGTERM", sigterm);

  const heartbeat = setInterval(() => {
    const quietFor = Date.now() - lastProgressAt;
    if (quietFor >= options.heartbeatSeconds * 1000) {
      progress(`still running; last update: ${lastProgress}`, false);
    }
  }, options.heartbeatSeconds * 1000);

  let buffer = "";
  let resultError: string | undefined;
  let resultText: string | undefined;
  const actualModels = new Set<string>();
  const decoder = new TextDecoder();

  const handleLine = (line: string): void => {
    if (line.trim().length === 0) {
      return;
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line) as Record<string, unknown>;
    } catch {
      metadata.malformedEvents += 1;
      progress("received malformed JSON event");
      return;
    }

    if (event.type === "system" && event.subtype === "init") {
      if (typeof event.session_id === "string") {
        metadata.sessionId = event.session_id;
      }
    }

    if (event.type === "result") {
      if (typeof event.result === "string") {
        resultText = event.result;
      }
      if (typeof event.session_id === "string") {
        metadata.sessionId = event.session_id;
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
        resultError = `Claude result reported ${subtype}`;
      }
    }

    for (const message of describeEvent(event)) {
      progress(message);
    }
  };

  const stdoutPromise = (async (): Promise<void> => {
    const reader = childStdout.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        writeSync(eventsDescriptor, value);
        buffer += decoder.decode(value, { stream: true });
        while (true) {
          const newline = buffer.indexOf("\n");
          if (newline < 0) {
            break;
          }
          const line = buffer.slice(0, newline).replace(/\r$/, "");
          buffer = buffer.slice(newline + 1);
          handleLine(line);
        }
      }
      buffer += decoder.decode();
      if (buffer.length > 0) {
        handleLine(buffer.replace(/\r$/, ""));
      }
    } finally {
      reader.releaseLock();
    }
  })();
  const stderrPromise = drainStream(childStderr, stderrDescriptor);

  const childExitCode = await child.exited;
  await Promise.all([stdoutPromise, stderrPromise]);
  clearInterval(heartbeat);
  process.off("SIGINT", sigint);
  process.off("SIGTERM", sigterm);

  metadata.actualModels = [...actualModels].sort();
  metadata.endedAt = new Date().toISOString();

  let exitCode = childExitCode;
  if (interruptedSignal) {
    exitCode = interruptedSignal === "SIGINT" ? 130 : 143;
    metadata.error = `interrupted by ${interruptedSignal}`;
    metadata.status = "interrupted";
  } else if (childExitCode !== 0) {
    metadata.error = `Claude exited with status ${childExitCode}`;
    metadata.status = "failed";
  } else if (metadata.malformedEvents > 0) {
    exitCode = 65;
    metadata.error = `received ${metadata.malformedEvents} malformed JSON event(s)`;
    metadata.status = "failed";
  } else if (resultError) {
    exitCode = 67;
    metadata.error = resultError;
    metadata.status = "failed";
  } else if (!resultText || resultText.trim().length === 0) {
    exitCode = 66;
    metadata.error = "Claude stream ended without a nonempty result event";
    metadata.status = "failed";
  } else {
    writeFileSync(resultPath, `${resultText.replace(/\n$/, "")}\n`, {
      mode: 0o600,
    });
    chmodSync(resultPath, 0o600);
    metadata.status = "succeeded";
  }

  metadata.exitCode = exitCode;
  writeMetadata(runPath, metadata);
  progress(
    metadata.status === "succeeded"
      ? `result saved to ${resultPath}`
      : `${metadata.status}: ${metadata.error}`,
  );

  closeSync(eventsDescriptor);
  closeSync(progressDescriptor);
  closeSync(stderrDescriptor);
  return exitCode;
}

process.exit(await main());
