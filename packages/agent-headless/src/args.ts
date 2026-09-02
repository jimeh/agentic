export type SplitArgs = {
  own: string[];
  passthrough: string[];
};

export function usageExit(lines: string[], exitCode = 2): never {
  const output = exitCode === 0 ? process.stdout : process.stderr;
  output.write(`${lines.join("\n")}\n`);
  process.exit(exitCode);
}

export function takeValue(
  args: string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

export function parseHeartbeatSeconds(value: string): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("--heartbeat-seconds must be greater than zero");
  }
  return seconds;
}

// Everything after the first bare `--` belongs to the wrapped CLI.
export function splitPassthrough(args: string[]): SplitArgs {
  const separator = args.indexOf("--");
  if (separator < 0) {
    return { own: args, passthrough: [] };
  }
  return {
    own: args.slice(0, separator),
    passthrough: args.slice(separator + 1),
  };
}

// Strips an attached value: `--opt=value` and the short form `-ovalue` both
// name `--opt` / `-o`. Short options with attached values are what clap-style
// CLIs accept, so a reserved check must see through them.
export function optionName(arg: string): string {
  if (arg.startsWith("--")) {
    return arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
  }
  if (arg.startsWith("-") && arg.length > 2) {
    return arg.slice(0, 2);
  }
  return arg;
}

// The attached value of a short option (`-ovalue` or `-o=value`), if any.
export function attachedValue(arg: string): string | undefined {
  if (!arg.startsWith("-") || arg.startsWith("--") || arg.length <= 2) {
    return undefined;
  }
  const value = arg.slice(2);
  return value.startsWith("=") ? value.slice(1) : value;
}

// Runner-owned options must not be overridden through the passthrough list.
export function rejectReserved(
  passthrough: string[],
  reserved: Set<string>,
  cli: string,
): void {
  for (const arg of passthrough) {
    const name = optionName(arg);
    if (reserved.has(name)) {
      throw new Error(`runner-owned ${cli} option cannot follow --: ${name}`);
    }
  }
}

export function optionValues(
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
