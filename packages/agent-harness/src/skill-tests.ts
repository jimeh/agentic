import { accessSync, constants, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Writable } from "node:stream";
import { runTestFiles, type StdioMode } from "./test-files";

type RunOptions = {
  rootDir?: string;
  stderr?: Writable;
  stdout?: Writable;
  stdio?: StdioMode;
};

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agent-config test skills [options]",
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

function collectTests(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTests(path);
    }
    if (entry.isFile() && /\.test\..+$/.test(entry.name)) {
      return [path];
    }
    return [];
  });
}

/** Return executable-test candidates under each first-party skill. */
export function discoverSkillTests(rootDir = "."): string[] {
  const root = resolve(rootDir);
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) {
    return [];
  }

  return readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => collectTests(join(skillsDir, entry.name, "tests")))
    .sort((left, right) => left.localeCompare(right));
}

function executableError(testFile: string): string | undefined {
  try {
    accessSync(testFile, constants.X_OK);
    return undefined;
  } catch {
    return "test file is not executable";
  }
}

/** Run all first-party skill tests through their shebang interpreters. */
export function runSkillTests(options: RunOptions = {}): number {
  const rootDir = resolve(options.rootDir ?? ".");
  const stderr = options.stderr ?? process.stderr;
  const tests = discoverSkillTests(rootDir);

  if (tests.length === 0) {
    stderr.write("ERROR: No skill tests found.\n");
    return 1;
  }

  return runTestFiles({
    commandFor: (testFile) => ({ args: [], command: testFile }),
    rootDir,
    stderr,
    stdout: options.stdout,
    stdio: options.stdio,
    testFiles: tests,
    validationError: executableError,
  });
}

export function skillTestsCommand(args: string[]): number {
  const { root } = parseArgs(args);
  return runSkillTests({ rootDir: root });
}
