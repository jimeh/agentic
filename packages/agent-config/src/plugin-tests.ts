import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Writable } from "node:stream";

type StdioMode = "inherit" | "pipe";

type RunOptions = {
  bash?: string;
  rootDir?: string;
  stderr?: Writable;
  stdout?: Writable;
  stdio?: StdioMode;
};

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agent-config test plugins [options]",
      "",
      "Options:",
      "  --root <path>  Repository root (default: current directory)",
      "  --help, -h     Show help",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseArgs(args: string[]): { root: string } {
  let root = process.cwd();

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--root") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        usage();
      }
      root = value;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`Unknown option: ${arg}`);
      usage();
    }
  }

  return { root };
}

function write(stream: Writable, message: string): void {
  stream.write(message);
}

function pluginDirs(rootDir: string): string[] {
  const pluginsDir = join(rootDir, "plugins");
  if (!existsSync(pluginsDir)) {
    return [];
  }

  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pluginsDir, entry.name));
}

function displayPath(rootDir: string, file: string): string {
  const path = relative(rootDir, file);
  if (path !== "" && !path.startsWith("..")) {
    return path;
  }

  return file;
}

/**
 * Return all plugin shell test files in deterministic order.
 */
export function discoverPluginTests(rootDir = "."): string[] {
  const root = resolve(rootDir);

  return pluginDirs(root)
    .flatMap((pluginDir) => {
      const testsDir = join(pluginDir, "tests");
      if (!existsSync(testsDir)) {
        return [];
      }

      return readdirSync(testsDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".test.sh"))
        .map((entry) => join(testsDir, entry.name));
    })
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Run discovered plugin shell tests and return a process exit code.
 */
export function runPluginTests(options: RunOptions = {}): number {
  const bash = options.bash ?? "bash";
  const rootDir = resolve(options.rootDir ?? ".");
  const stderr = options.stderr ?? process.stderr;
  const stdout = options.stdout ?? process.stdout;
  const stdio = options.stdio ?? "inherit";
  const tests = discoverPluginTests(rootDir);

  if (tests.length === 0) {
    write(stdout, "No plugin tests found.\n");
    return 0;
  }

  let failed = 0;

  for (const testFile of tests) {
    const label = displayPath(rootDir, testFile);
    write(stdout, `::group::${label}\n`);
    const result = spawnSync(bash, [testFile], {
      cwd: rootDir,
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
      const reason = result.error ? `: ${result.error.message}` : "";
      write(stderr, `ERROR: ${label}: test failed${reason}\n`);
      failed += 1;
    }
  }

  write(stdout, `\nRan ${tests.length} test file(s), ${failed} failed.\n`);
  return failed > 0 ? 1 : 0;
}

export function pluginTestsCommand(args: string[]): number {
  const { root } = parseArgs(args);
  return runPluginTests({ rootDir: root });
}
