import { resolve } from "node:path";
import { updateThirdpartySkills } from "./update";
import type { VendorOptions } from "./types";

type ParsedCommand = {
  root: string;
  options: VendorOptions;
};

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agentic-vendor-skills <command> [options]",
      "",
      "Commands:",
      "  update      Update vendored third-party skills",
      "  check       Check whether vendored third-party skills are current",
      "",
      "Options:",
      "  --root <path>     Repository root (default: current directory)",
      "  --dry-run, -n     Preview update changes",
      "  --skill <name>    Limit update/check to one skill",
      "  --help, -h        Show help",
    ].join("\n"),
  );
  process.exit(exitCode);
}

/** Parse CLI arguments into updater options. */
export function parseCommand(args: string[]): ParsedCommand {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    usage(command ? 0 : 2);
  }

  if (command !== "update" && command !== "check") {
    console.error(`Unknown command: ${command}`);
    usage();
  }

  const skills: string[] = [];
  let root = process.cwd();
  let dryRun = command === "check";
  const check = command === "check";

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "-n") {
      dryRun = true;
    } else if (arg === "--root") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        usage();
      }
      root = value;
      i += 1;
    } else if (arg === "--skill") {
      const name = args[i + 1];
      if (!name || name.startsWith("-")) {
        usage();
      }
      skills.push(name);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`Unknown option: ${arg}`);
      usage();
    }
  }

  return {
    root: resolve(root),
    options: {
      dryRun,
      check,
      filter: skills.length > 0 ? new Set(skills) : null,
    },
  };
}

/** Run the third-party skills CLI and return a process exit code. */
export function main(args: string[]): number {
  try {
    const parsed = parseCommand(args);
    const result = updateThirdpartySkills(parsed);
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    return 1;
  }
}
