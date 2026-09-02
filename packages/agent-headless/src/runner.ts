import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  renameSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type RunStatus = "failed" | "interrupted" | "running" | "succeeded";

export type BaseRunMetadata = {
  artifactDir: string;
  cwd: string;
  endedAt?: string;
  error?: string;
  exitCode?: number;
  malformedEvents: number;
  pid?: number;
  schemaVersion: 1;
  sessionId?: string;
  startedAt: string;
  status: RunStatus;
};

export type ArtifactPaths = {
  artifactDir: string;
  events: string;
  progress: string;
  result: string;
  run: string;
  stderr: string;
};

export type EventContext = {
  setResult(text: string): void;
  setResultError(message: string): void;
  setSessionId(sessionId: string): void;
};

export type RunSpec = {
  // CLI name used as the stderr prefix and in run metadata errors.
  agent: string;
  artifactDir?: string;
  // Built after the artifact directory exists so the command can refer to it.
  command(paths: ArtifactPaths): string[];
  // Human name of the wrapped CLI for progress and error text.
  displayName: string;
  // Error recorded when the CLI exits cleanly without producing a result.
  emptyResultError: string;
  // Called once the streams close, before the exit status is decided.
  finalize?(context: EventContext): void;
  heartbeatSeconds: number;
  // Agent-specific fields merged into run.json on every write. The object is
  // live: mutations before the run ends are reflected in the final metadata.
  metadata: Record<string, unknown>;
  // Returns concise progress lines for one parsed stream event.
  onEvent(event: Record<string, unknown>, context: EventContext): string[];
  startMessage: string;
};

const managedFiles = [
  "events.ndjson",
  "progress.log",
  "result.md",
  "run.json",
  "stderr.log",
];

export function createArtifactDir(agent: string, requested?: string): string {
  const artifactDir = requested
    ? resolve(requested)
    : mkdtempSync(join(tmpdir(), `${agent}.`));

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

function writeMetadata(
  path: string,
  base: BaseRunMetadata,
  extra: Record<string, unknown>,
): void {
  const temporary = `${path}.tmp`;
  writeFileSync(
    temporary,
    `${JSON.stringify({ ...base, ...extra }, null, 2)}\n`,
    { mode: 0o600 },
  );
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
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

export async function runHeadless(spec: RunSpec): Promise<number> {
  let artifactDir: string;
  try {
    artifactDir = createArtifactDir(spec.agent, spec.artifactDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${spec.agent}: ${message}\n`);
    return 2;
  }

  const paths: ArtifactPaths = {
    artifactDir,
    events: join(artifactDir, "events.ndjson"),
    progress: join(artifactDir, "progress.log"),
    result: join(artifactDir, "result.md"),
    run: join(artifactDir, "run.json"),
    stderr: join(artifactDir, "stderr.log"),
  };
  const eventsDescriptor = createPrivateFile(paths.events);
  const progressDescriptor = createPrivateFile(paths.progress);
  const stderrDescriptor = createPrivateFile(paths.stderr);
  closeSync(createPrivateFile(paths.result));

  const metadata: BaseRunMetadata = {
    artifactDir,
    cwd: process.cwd(),
    malformedEvents: 0,
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    status: "running",
  };
  const saveMetadata = (): void =>
    writeMetadata(paths.run, metadata, spec.metadata);
  const closeFiles = (): void => {
    closeSync(eventsDescriptor);
    closeSync(progressDescriptor);
    closeSync(stderrDescriptor);
  };

  process.stderr.write(`${spec.agent}: artifacts: ${artifactDir}\n`);

  let lastProgressAt = Date.now();
  let lastProgress = `starting ${spec.displayName}`;
  const progress = (message: string, activity = true): void => {
    const timestamp = new Date().toISOString();
    writeSync(progressDescriptor, `${timestamp}\t${message}\n`);
    process.stderr.write(`${spec.agent}: ${message}\n`);
    if (activity) {
      lastProgressAt = Date.now();
      lastProgress = message;
    }
  };

  progress(spec.startMessage);

  let child: ReturnType<typeof Bun.spawn>;
  try {
    child = Bun.spawn(spec.command(paths), {
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
    saveMetadata();
    progress(`failed to start ${spec.displayName}: ${message}`);
    closeFiles();
    return 127;
  }

  metadata.pid = child.pid;
  saveMetadata();
  const childStdout = child.stdout as ReadableStream<Uint8Array>;
  const childStderr = child.stderr as ReadableStream<Uint8Array>;

  let interruptedSignal: NodeJS.Signals | undefined;
  const forwardSignal = (signal: NodeJS.Signals): void => {
    interruptedSignal = signal;
    progress(`forwarding ${signal} to ${spec.displayName}`);
    child.kill(signal);
  };
  const sigint = (): void => forwardSignal("SIGINT");
  const sigterm = (): void => forwardSignal("SIGTERM");
  process.on("SIGINT", sigint);
  process.on("SIGTERM", sigterm);

  const heartbeat = setInterval(() => {
    const quietFor = Date.now() - lastProgressAt;
    if (quietFor >= spec.heartbeatSeconds * 1000) {
      progress(`still running; last update: ${lastProgress}`, false);
    }
  }, spec.heartbeatSeconds * 1000);

  let resultError: string | undefined;
  let resultText: string | undefined;
  const context: EventContext = {
    setResult(text) {
      resultText = text;
    },
    setResultError(message) {
      resultError = message;
    },
    setSessionId(sessionId) {
      metadata.sessionId = sessionId;
    },
  };

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

    for (const message of spec.onEvent(event, context)) {
      progress(message);
    }
  };

  const decoder = new TextDecoder();
  let buffer = "";
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

  spec.finalize?.(context);
  metadata.endedAt = new Date().toISOString();

  let exitCode = childExitCode;
  if (interruptedSignal) {
    exitCode = interruptedSignal === "SIGINT" ? 130 : 143;
    metadata.error = `interrupted by ${interruptedSignal}`;
    metadata.status = "interrupted";
  } else if (childExitCode !== 0) {
    const detail = resultError ? `: ${resultError}` : "";
    metadata.error = `${spec.displayName} exited with status ${childExitCode}${detail}`;
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
    metadata.error = spec.emptyResultError;
    metadata.status = "failed";
  } else {
    writeFileSync(paths.result, `${resultText.replace(/\n$/, "")}\n`, {
      mode: 0o600,
    });
    chmodSync(paths.result, 0o600);
    metadata.status = "succeeded";
  }

  metadata.exitCode = exitCode;
  saveMetadata();
  progress(
    metadata.status === "succeeded"
      ? `result saved to ${paths.result}`
      : `${metadata.status}: ${metadata.error}`,
  );

  closeFiles();
  return exitCode;
}
