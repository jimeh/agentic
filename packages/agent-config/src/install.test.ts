import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dir, "../../..");
const cli = join(import.meta.dir, "..", "bin", "agent-config.ts");
const bun = process.execPath;
let tempDirs: string[] = [];

function createHome(): string {
  const home = mkdtempSync(join(tmpdir(), "agentic-install-home-"));
  tempDirs.push(home);
  return home;
}

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "agentic-install-root-"));
  tempDirs.push(root);
  return root;
}

function run(home: string, args: string[] = [], path = "/usr/bin:/bin") {
  return spawnSync(bun, [cli, "install", ...args], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      PATH: path,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function createClaudeStub(): string {
  const binDir = mkdtempSync(join(tmpdir(), "agentic-claude-bin-"));
  tempDirs.push(binDir);
  const claude = join(binDir, "claude");
  writeFileSync(
    claude,
    [
      "#!/bin/sh",
      'if [ "$1 $2 $3 $4" = "plugin marketplace list --json" ]; then',
      "  printf '%s\\n' '[]'",
      "  exit 0",
      "fi",
      'if [ "$1 $2 $3" = "plugin list --json" ]; then',
      "  printf '%s\\n' '[]'",
      "  exit 0",
      "fi",
      'echo unexpected claude args: "$@" >&2',
      "exit 1",
      "",
    ].join("\n"),
  );
  chmodSync(claude, 0o755);
  return binDir;
}

function createDriftedClaudeStub(): string {
  const binDir = mkdtempSync(join(tmpdir(), "agentic-claude-bin-"));
  tempDirs.push(binDir);
  const claude = join(binDir, "claude");
  const marketplaces =
    '[{"name":"openai-codex","source":"github","repo":"evil/other-repo"}]';
  writeFileSync(
    claude,
    [
      "#!/bin/sh",
      'if [ "$1 $2 $3 $4" = "plugin marketplace list --json" ]; then',
      `  printf '%s\\n' '${marketplaces}'`,
      "  exit 0",
      "fi",
      'if [ "$1 $2 $3" = "plugin list --json" ]; then',
      "  printf '%s\\n' '[]'",
      "  exit 0",
      "fi",
      'echo unexpected claude args: "$@" >&2',
      "exit 1",
      "",
    ].join("\n"),
  );
  chmodSync(claude, 0o755);
  return binDir;
}

function createFailingClaudeStub(): string {
  const binDir = mkdtempSync(join(tmpdir(), "agentic-claude-bin-"));
  tempDirs.push(binDir);
  const claude = join(binDir, "claude");
  writeFileSync(
    claude,
    ["#!/bin/sh", "echo boom >&2", "exit 1", ""].join("\n"),
  );
  chmodSync(claude, 0o755);
  return binDir;
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

test("installs generated global rule symlinks", () => {
  const home = createHome();

  const result = run(home);

  expect(result.status).toBe(0);
  expect(readlinkSync(join(home, ".claude", "CLAUDE.md"))).toBe(
    join(rootDir, "generated", "CLAUDE.md"),
  );
  expect(readlinkSync(join(home, ".agents", "AGENTS.md"))).toBe(
    join(rootDir, "generated", "AGENTS.md"),
  );
  expect(readlinkSync(join(home, ".codex", "AGENTS.md"))).toBe(
    join(rootDir, "generated", "AGENTS.md"),
  );
});

test("relinks legacy RULES.md symlinks without force", () => {
  const home = createHome();
  mkdirSync(join(home, ".claude"), { recursive: true });
  symlinkSync(join(rootDir, "RULES.md"), join(home, ".claude", "CLAUDE.md"));

  const result = run(home);

  expect(result.status).toBe(0);
  expect(readlinkSync(join(home, ".claude", "CLAUDE.md"))).toBe(
    join(rootDir, "generated", "CLAUDE.md"),
  );
});

test("dry-run does not create symlinks", () => {
  const home = createHome();

  const result = run(home, ["--dry-run"]);

  expect(result.status).toBe(0);
  expect(existsSync(join(home, ".claude", "CLAUDE.md"))).toBe(false);
});

test("dry-run previews external Claude Codex plugin setup", () => {
  const home = createHome();
  const binDir = createClaudeStub();

  const result = run(home, ["--dry-run"], `${binDir}:/usr/bin:/bin`);

  expect(result.status).toBe(0);
  expect(result.stderr).toContain("would add marketplace openai-codex");
  expect(result.stderr).toContain("would install plugin codex@openai-codex");
});

test("loads YAML config files", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(
    join(root, "agent-config.yaml"),
    [
      "symlinks:",
      "  - source: generated/CLAUDE.md",
      "    target: ~/.claude/CLAUDE.md",
      "skillSymlinks: []",
      "staleSymlinkCleanup: []",
      "claude:",
      "  marketplaces: []",
      "  plugins: []",
      "",
    ].join("\n"),
  );

  const result = run(home, ["--root", root, "--dry-run"]);

  expect(result.status).toBe(0);
  expect(result.stderr).toContain("would link");
  expect(result.stderr).toContain(".claude/CLAUDE.md");
});

test("rejects home targets without an explicit home prefix", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      'symlinks = [{ source = "generated/CLAUDE.md", target = ".claude/CLAUDE.md" }]',
      "skillSymlinks = []",
      "staleSymlinkCleanup = []",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );

  const result = run(home, ["--root", root, "--dry-run"]);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "$.symlinks[0].target: expected home-relative path starting with ~/",
  );
});

test("force numbers backups instead of replacing earlier ones", () => {
  const home = createHome();
  const target = join(home, ".codex", "pets");
  const makeDir = (content: string) => {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "pet.md"), content);
  };

  makeDir("first\n");
  let result = run(home, ["--force"]);
  expect(result.status).toBe(0);
  expect(lstatSync(target).isSymbolicLink()).toBe(true);

  makeDir("second\n");
  result = run(home, ["--force"]);
  expect(result.status).toBe(0);
  expect(lstatSync(target).isSymbolicLink()).toBe(true);
  expect(readFileSync(join(`${target}.bak`, "pet.md"), "utf8")).toBe("first\n");
  expect(readFileSync(join(`${target}.bak2`, "pet.md"), "utf8")).toBe(
    "second\n",
  );
});

test("fails when a GitHub marketplace points at a different repo", () => {
  const home = createHome();
  const binDir = createDriftedClaudeStub();

  const result = run(home, ["--dry-run"], `${binDir}:/usr/bin:/bin`);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "marketplace openai-codex points to evil/other-repo",
  );
  expect(result.stderr).toContain("(expected openai/codex-plugin-cc)");
});

test("surfaces claude CLI failures instead of reinstalling", () => {
  const home = createHome();
  const binDir = createFailingClaudeStub();

  const result = run(home, ["--dry-run"], `${binDir}:/usr/bin:/bin`);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "claude plugin marketplace list --json failed",
  );
  expect(result.stderr).toContain("boom");
});

test("skips unmanaged existing files unless force is set", () => {
  const home = createHome();
  const target = join(home, ".claude", "CLAUDE.md");
  mkdirSync(join(home, ".claude"), { recursive: true });
  writeFileSync(target, "custom\n");

  const result = run(home);

  expect(result.status).toBe(0);
  expect(lstatSync(target).isSymbolicLink()).toBe(false);
});
