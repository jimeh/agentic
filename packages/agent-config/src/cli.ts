import { checkAgentHarness } from "./harness";
import { installAgentConfig } from "./install";
import { pluginTestsCommand } from "./plugin-tests";
import { rulesCommand } from "./rules";
import { schemaCommand } from "./schema";

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agent-config <command> [options]",
      "",
      "Commands:",
      "  install          Install configured symlinks and Claude plugins",
      "  rules <command>  Build or check generated global rules",
      "  schema <command> Build or check the agent config schema",
      "  test plugins     Run plugin shell tests",
      "  check harness    Run agent harness checks",
      "",
      "Options:",
      "  --help, -h       Show help",
    ].join("\n"),
  );
  process.exit(exitCode);
}

/** Run the agent config CLI and return a process exit code. */
export async function main(args: string[]): Promise<number> {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    usage(command ? 0 : 2);
  }

  try {
    if (command === "install") {
      return installAgentConfig(args.slice(1));
    }

    if (command === "rules") {
      return rulesCommand(args.slice(1));
    }

    if (command === "schema") {
      return schemaCommand(args.slice(1));
    }

    if (command === "test" && args[1] === "plugins") {
      return pluginTestsCommand(args.slice(2));
    }

    if (command === "check" && args[1] === "harness") {
      return checkAgentHarness(args.slice(2));
    }

    console.error(`Unknown command: ${args.join(" ")}`);
    usage();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: ${message}`);
    return 1;
  }
}
