#!/usr/bin/env bun

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
      "Usage: scripts/render-global-rules.ts [--check]",
      "",
      "Options:",
      "  --check  Verify generated global rule files are up to date",
      "  --root   Repository root (default: script parent directory)",
      "  --help   Show help",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseArgs(args: string[]): { check: boolean; root: string } {
  let check = false;
  let root = resolve(import.meta.dir, "..");

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--check") {
      check = true;
    } else if (arg === "--root") {
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

  return { check, root };
}

function stripTopLevelComments(markdown: string): string {
  return markdown.replace(/^<!--[\s\S]*?-->\n?/, "").trim();
}

function renderTarget(rootDir: string, overlayPath: string): string {
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
  writeFileSync(target.output, renderTarget(rootDir, target.overlay));
}

function checkTarget(rootDir: string, target: Target): boolean {
  const expected = renderTarget(rootDir, target.overlay);
  let actual = "";

  try {
    actual = readFileSync(target.output, "utf8");
  } catch {
    console.error(
      `ERROR: ${target.output} is missing; run mise run rules:build`,
    );
    return false;
  }

  if (actual !== expected) {
    console.error(`ERROR: ${target.output} is stale; run mise run rules:build`);
    return false;
  }

  return true;
}

function main(args: string[]): number {
  const { check, root } = parseArgs(args);
  const ruleTargets = targets(root);

  if (check) {
    return ruleTargets.every((target) => checkTarget(root, target)) ? 0 : 1;
  }

  for (const target of ruleTargets) {
    writeTarget(root, target);
  }

  return 0;
}

process.exitCode = main(process.argv.slice(2));
