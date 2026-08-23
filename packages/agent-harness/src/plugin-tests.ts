import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Writable } from "node:stream";
import { runTestFiles, type StdioMode } from "./test-files";

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

function pluginDirs(rootDir: string): string[] {
  const pluginsDir = join(rootDir, "plugins");
  if (!existsSync(pluginsDir)) {
    return [];
  }

  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pluginsDir, entry.name));
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
    stdout.write("No plugin tests found.\n");
    return 0;
  }

  return runTestFiles({
    commandFor: (testFile) => ({ args: [testFile], command: bash }),
    rootDir,
    stderr,
    stdout,
    stdio,
    testFiles: tests,
  });
}

export function pluginTestsCommand(args: string[]): number {
  const { root } = parseArgs(args);
  return runPluginTests({ rootDir: root });
}
