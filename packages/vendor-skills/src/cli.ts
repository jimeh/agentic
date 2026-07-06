import { resolve } from "node:path";
import { addThirdpartySkills } from "./add";
import { updateThirdpartySkills } from "./update";
import type { AddOptions, VendorOptions } from "./types";

type ParsedUpdateCommand = {
  command: "update" | "check";
  root: string;
  options: VendorOptions;
};

type ParsedAddCommand = {
  command: "add";
  root: string;
  options: AddOptions;
};

type ParsedCommand = ParsedUpdateCommand | ParsedAddCommand;

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: vendor-skills <command> [options]",
      "",
      "Commands:",
      "  add <source> Add skills from an upstream source to the manifest",
      "  update      Update vendored third-party skills",
      "  check       Check whether vendored third-party skills are current",
      "",
      "Options:",
      "  --root <path>     Repository root (default: current directory)",
      "  --ref <ref>       Git ref for add source discovery",
      "  --dry-run, -n     Preview update changes",
      "  --skill <name>    Skill to add (frontmatter name or directory",
      "                    name), or limit update/check to one skill",
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

  if (command !== "add" && command !== "update" && command !== "check") {
    console.error(`Unknown command: ${command}`);
    usage();
  }

  if (command === "add") {
    return parseAddCommand(args.slice(1));
  }

  return parseUpdateCommand(command, args.slice(1));
}

function parseUpdateCommand(
  command: "update" | "check",
  args: string[],
): ParsedUpdateCommand {
  const skills: string[] = [];
  let root = process.cwd();
  let dryRun = command === "check";
  const check = command === "check";

  for (let i = 0; i < args.length; i += 1) {
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
    command,
    root: resolve(root),
    options: {
      dryRun,
      check,
      filter: skills.length > 0 ? new Set(skills) : null,
    },
  };
}

function parseAddCommand(args: string[]): ParsedAddCommand {
  const skills: string[] = [];
  let root = process.cwd();
  let dryRun = false;
  let ref: string | null = null;
  let source: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
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
    } else if (arg === "--ref") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        usage();
      }
      ref = value;
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
    } else if (!source) {
      source = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      usage();
    }
  }

  if (!source) {
    console.error("Missing source URL or GitHub owner/repo");
    usage();
  }

  return {
    command: "add",
    root: resolve(root),
    options: {
      source,
      ref,
      dryRun,
      skills,
    },
  };
}

/** Run the third-party skills CLI and return a process exit code. */
export async function main(args: string[]): Promise<number> {
  try {
    const parsed = parseCommand(args);
    const result =
      parsed.command === "add"
        ? await addThirdpartySkills(parsed)
        : updateThirdpartySkills(parsed);
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    return 1;
  }
}
