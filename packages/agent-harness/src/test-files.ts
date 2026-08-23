import { spawnSync } from "node:child_process";
import { relative } from "node:path";
import type { Writable } from "node:stream";

export type StdioMode = "inherit" | "pipe";

type TestCommand = {
  args: string[];
  command: string;
};

type RunTestFilesOptions = {
  commandFor: (testFile: string) => TestCommand;
  rootDir: string;
  stderr?: Writable;
  stdout?: Writable;
  stdio?: StdioMode;
  testFiles: string[];
  validationError?: (testFile: string) => string | undefined;
};

function write(stream: Writable, message: string): void {
  stream.write(message);
}

function displayPath(rootDir: string, file: string): string {
  const path = relative(rootDir, file);
  if (path !== "" && !path.startsWith("..")) {
    return path;
  }

  return file;
}

/** Run every supplied test file and aggregate failures. */
export function runTestFiles(options: RunTestFilesOptions): number {
  const stderr = options.stderr ?? process.stderr;
  const stdout = options.stdout ?? process.stdout;
  const stdio = options.stdio ?? "inherit";
  let failed = 0;

  for (const testFile of options.testFiles) {
    const label = displayPath(options.rootDir, testFile);
    write(stdout, `::group::${label}\n`);

    const validationError = options.validationError?.(testFile);
    if (validationError) {
      write(stderr, `ERROR: ${label}: ${validationError}\n`);
      failed += 1;
      write(stdout, "::endgroup::\n");
      continue;
    }

    const invocation = options.commandFor(testFile);
    const result = spawnSync(invocation.command, invocation.args, {
      cwd: options.rootDir,
      stdio,
      encoding: "utf8",
    });
    if (stdio === "pipe") {
      if (result.stdout) {
        write(stdout, result.stdout);
      }
      if (result.stderr) {
        write(stderr, result.stderr);
      }
    }
    write(stdout, "::endgroup::\n");

    if (result.status !== 0) {
      const reason = result.error
        ? `: ${result.error.message}`
        : result.signal
          ? `: signal ${result.signal}`
          : "";
      write(stderr, `ERROR: ${label}: test failed${reason}\n`);
      failed += 1;
    }
  }

  write(
    stdout,
    `\nRan ${options.testFiles.length} test file(s), ${failed} failed.\n`,
  );
  return failed > 0 ? 1 : 0;
}
