import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const agentConfigSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/jimeh/agentic/schemas/agent-config.schema.json",
  title: "Agent Config",
  type: "object",
  additionalProperties: false,
  required: ["symlinks", "skillSymlinks", "staleSymlinkCleanup", "claude"],
  properties: {
    $schema: {
      type: "string",
    },
    symlinks: {
      type: "array",
      items: {
        $ref: "#/$defs/symlink",
      },
    },
    skillSymlinks: {
      type: "array",
      items: {
        $ref: "#/$defs/skillSymlink",
      },
    },
    staleSymlinkCleanup: {
      type: "array",
      items: {
        $ref: "#/$defs/staleSymlinkCleanup",
      },
    },
    claude: {
      type: "object",
      additionalProperties: false,
      required: ["marketplaces", "plugins"],
      properties: {
        marketplaces: {
          type: "array",
          items: {
            $ref: "#/$defs/claudeMarketplace",
          },
        },
        localMarketplace: {
          $ref: "#/$defs/localClaudeMarketplace",
        },
        plugins: {
          type: "array",
          items: {
            $ref: "#/$defs/claudePlugin",
          },
        },
      },
    },
  },
  $defs: {
    nonEmptyString: {
      type: "string",
      minLength: 1,
    },
    homePath: {
      type: "string",
      pattern: "^~/.+",
    },
    symlink: {
      type: "object",
      additionalProperties: false,
      required: ["source", "target"],
      properties: {
        source: {
          $ref: "#/$defs/nonEmptyString",
        },
        target: {
          $ref: "#/$defs/homePath",
        },
      },
    },
    skillSymlink: {
      type: "object",
      additionalProperties: false,
      required: ["sourceRoot", "targetRoots"],
      properties: {
        sourceRoot: {
          $ref: "#/$defs/nonEmptyString",
        },
        targetRoots: {
          type: "array",
          items: {
            $ref: "#/$defs/homePath",
          },
        },
      },
    },
    staleSymlinkCleanup: {
      type: "object",
      additionalProperties: false,
      required: ["sourceDir", "targetDir"],
      properties: {
        sourceDir: {
          $ref: "#/$defs/nonEmptyString",
        },
        targetDir: {
          $ref: "#/$defs/homePath",
        },
      },
    },
    claudeMarketplace: {
      type: "object",
      additionalProperties: false,
      required: ["name", "source"],
      properties: {
        name: {
          $ref: "#/$defs/nonEmptyString",
        },
        source: {
          $ref: "#/$defs/nonEmptyString",
        },
      },
    },
    localClaudeMarketplace: {
      type: "object",
      additionalProperties: false,
      required: ["manifest", "source", "plugins"],
      properties: {
        manifest: {
          $ref: "#/$defs/nonEmptyString",
        },
        source: {
          $ref: "#/$defs/nonEmptyString",
        },
        plugins: {
          type: "array",
          items: {
            $ref: "#/$defs/nonEmptyString",
          },
        },
      },
    },
    claudePlugin: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: {
          $ref: "#/$defs/nonEmptyString",
        },
      },
    },
  },
};

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agent-config schema <build|check> [options]",
      "",
      "Options:",
      "  --root   Repository root (default: current directory)",
      "  --help   Show help",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseArgs(args: string[]): {
  command: "build" | "check";
  root: string;
} {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    usage(command ? 0 : 2);
  }
  if (command !== "build" && command !== "check") {
    console.error(`ERROR: Unknown schema command: ${command}`);
    usage();
  }

  let root = process.cwd();

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--root") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        usage();
      }
      root = resolve(value);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`ERROR: Unknown argument: ${arg}`);
      usage();
    }
  }

  return { command, root: resolve(root) };
}

function schemaPath(root: string): string {
  return join(root, "schemas", "agent-config.schema.json");
}

function jsonIndent(depth: number): string {
  return "  ".repeat(depth);
}

function isPrimitiveArray(value: unknown[]): boolean {
  return value.every(
    (entry) =>
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "number" ||
      typeof entry === "boolean",
  );
}

function stringifyJson(value: unknown, depth = 0): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    if (isPrimitiveArray(value)) {
      return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
    }

    const entries = value.map(
      (entry) => `${jsonIndent(depth + 1)}${stringifyJson(entry, depth + 1)}`,
    );
    return `[\n${entries.join(",\n")}\n${jsonIndent(depth)}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, entry]) => {
      return `${jsonIndent(depth + 1)}${JSON.stringify(key)}: ${stringifyJson(
        entry,
        depth + 1,
      )}`;
    });
    return `{\n${entries.join(",\n")}\n${jsonIndent(depth)}}`;
  }

  return JSON.stringify(value);
}

function renderSchema(): string {
  return `${stringifyJson(agentConfigSchema)}\n`;
}

export function buildSchema(root: string): void {
  const output = schemaPath(resolve(root));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, renderSchema());
}

export function checkSchema(root: string): boolean {
  const output = schemaPath(resolve(root));
  const expected = renderSchema();
  let actual = "";

  try {
    actual = readFileSync(output, "utf8");
  } catch {
    console.error(`ERROR: ${output} is missing; run agent-config schema build`);
    return false;
  }

  if (actual !== expected) {
    console.error(`ERROR: ${output} is stale; run agent-config schema build`);
    return false;
  }

  return true;
}

export function schemaCommand(args: string[]): number {
  const { command, root } = parseArgs(args);

  if (command === "check") {
    return checkSchema(root) ? 0 : 1;
  }

  buildSchema(root);
  return 0;
}
