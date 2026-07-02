import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Target = {
  output: string;
  overlay: string;
};

function targets(rootDir: string): Target[] {
  return [
    {
      output: join(rootDir, "generated", "AGENTS.md"),
      overlay: join(rootDir, "rules", "agents.md"),
    },
    {
      output: join(rootDir, "generated", "CLAUDE.md"),
      overlay: join(rootDir, "rules", "claude.md"),
    },
  ];
}

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agent-config rules <build|check> [options]",
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
    console.error(`ERROR: Unknown rules command: ${command}`);
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

function stripTopLevelComments(markdown: string): string {
  return markdown.replace(/^<!--[\s\S]*?-->\n?/, "").trim();
}

export function renderRuleTarget(rootDir: string, overlayPath: string): string {
  const base = readFileSync(
    join(rootDir, "rules", "base.md"),
    "utf8",
  ).trimEnd();
  const overlay = stripTopLevelComments(readFileSync(overlayPath, "utf8"));
  const parts = [base];

  if (overlay !== "") {
    parts.push(overlay);
  }

  return `${parts.join("\n\n")}\n`;
}

function writeTarget(rootDir: string, target: Target): void {
  mkdirSync(dirname(target.output), { recursive: true });
  writeFileSync(target.output, renderRuleTarget(rootDir, target.overlay));
}

function checkTarget(rootDir: string, target: Target): boolean {
  const expected = renderRuleTarget(rootDir, target.overlay);
  let actual = "";

  try {
    actual = readFileSync(target.output, "utf8");
  } catch {
    console.error(
      `ERROR: ${target.output} is missing; run agent-config rules build`,
    );
    return false;
  }

  if (actual !== expected) {
    console.error(
      `ERROR: ${target.output} is stale; run agent-config rules build`,
    );
    return false;
  }

  return true;
}

export function buildRules(root: string): void {
  const ruleTargets = targets(resolve(root));
  for (const target of ruleTargets) {
    writeTarget(resolve(root), target);
  }
}

export function checkRules(root: string): boolean {
  const resolvedRoot = resolve(root);
  const ruleTargets = targets(resolvedRoot);
  return ruleTargets.every((target) => checkTarget(resolvedRoot, target));
}

export function rulesCommand(args: string[]): number {
  const { command, root } = parseArgs(args);
  const ruleTargets = targets(root);

  if (command === "check") {
    return ruleTargets.every((target) => checkTarget(root, target)) ? 0 : 1;
  }

  for (const target of ruleTargets) {
    writeTarget(root, target);
  }

  return 0;
}
