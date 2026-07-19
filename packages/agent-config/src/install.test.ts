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

function createExternalPluginRoot(): string {
  const root = createRoot();
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = []",
      "skillSymlinks = []",
      "staleSymlinkCleanup = []",
      "[claude]",
      'marketplaces = [{ name = "example", source = "acme/example-plugins" }]',
      'plugins = [{ id = "demo@example" }]',
      "",
    ].join("\n"),
  );
  return root;
}

function createDriftedClaudeStub(): string {
  const binDir = mkdtempSync(join(tmpdir(), "agentic-claude-bin-"));
  tempDirs.push(binDir);
  const claude = join(binDir, "claude");
  const marketplaces =
    '[{"name":"example","source":"github","repo":"evil/other-repo"}]';
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

test("installs managed Claude gateway agent symlinks", () => {
  const home = createHome();

  const result = run(home);

  expect(result.status).toBe(0);
  expect(readlinkSync(join(home, ".claude", "agents", "sol.md"))).toBe(
    join(rootDir, "claude", "agents", "sol.md"),
  );
  expect(readlinkSync(join(home, ".claude", "agents", "terra.md"))).toBe(
    join(rootDir, "claude", "agents", "terra.md"),
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

test("dry-run previews external Claude plugin setup", () => {
  const home = createHome();
  const root = createExternalPluginRoot();
  const binDir = createClaudeStub();

  const result = run(
    home,
    ["--root", root, "--dry-run"],
    `${binDir}:/usr/bin:/bin`,
  );

  expect(result.status).toBe(0);
  expect(result.stderr).toContain("would add marketplace example");
  expect(result.stderr).toContain("would install plugin demo@example");
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
  const root = createExternalPluginRoot();
  const binDir = createDriftedClaudeStub();

  const result = run(
    home,
    ["--root", root, "--dry-run"],
    `${binDir}:/usr/bin:/bin`,
  );

  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "marketplace example points to evil/other-repo",
  );
  expect(result.stderr).toContain("(expected acme/example-plugins)");
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

function createScopedSkillsRoot(): string {
  const root = createRoot();
  for (const skill of ["plain-skill", "codex-thing", "claude-thing"]) {
    mkdirSync(join(root, "skills", skill), { recursive: true });
    writeFileSync(join(root, "skills", skill, "SKILL.md"), `# ${skill}\n`);
  }
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = []",
      "skillSymlinks = [",
      '  { sourceRoot = "skills", exclude = ["codex-*", "claude-*"], targetRoots = [',
      '    "~/.claude/skills",',
      '    "~/.agents/skills",',
      "  ] },",
      '  { sourceRoot = "skills", only = ["codex-*"], targetRoots = [',
      '    "~/.claude/skills",',
      "  ] },",
      '  { sourceRoot = "skills", only = ["claude-*"], targetRoots = [',
      '    "~/.agents/skills",',
      "  ] },",
      "]",
      "staleSymlinkCleanup = [",
      '  { sourceDir = "skills", targetDir = "~/.claude/skills" },',
      '  { sourceDir = "skills", targetDir = "~/.agents/skills" },',
      "]",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );
  return root;
}

test("only/exclude globs scope skill symlinks per target root", () => {
  const home = createHome();
  const root = createScopedSkillsRoot();

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(0);
  expect(readlinkSync(join(home, ".claude", "skills", "plain-skill"))).toBe(
    join(root, "skills", "plain-skill"),
  );
  expect(readlinkSync(join(home, ".agents", "skills", "plain-skill"))).toBe(
    join(root, "skills", "plain-skill"),
  );
  expect(readlinkSync(join(home, ".claude", "skills", "codex-thing"))).toBe(
    join(root, "skills", "codex-thing"),
  );
  expect(existsSync(join(home, ".agents", "skills", "codex-thing"))).toBe(
    false,
  );
  expect(readlinkSync(join(home, ".agents", "skills", "claude-thing"))).toBe(
    join(root, "skills", "claude-thing"),
  );
  expect(existsSync(join(home, ".claude", "skills", "claude-thing"))).toBe(
    false,
  );
});

test("cleanup removes links scoped out of a target root", () => {
  const home = createHome();
  const root = createScopedSkillsRoot();
  const staleCodex = join(home, ".agents", "skills", "codex-thing");
  const staleClaude = join(home, ".claude", "skills", "claude-thing");
  mkdirSync(join(home, ".agents", "skills"), { recursive: true });
  mkdirSync(join(home, ".claude", "skills"), { recursive: true });
  symlinkSync(join(root, "skills", "codex-thing"), staleCodex);
  symlinkSync(join(root, "skills", "claude-thing"), staleClaude);

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(0);
  expect(existsSync(staleCodex)).toBe(false);
  expect(existsSync(staleClaude)).toBe(false);
  expect(readlinkSync(join(home, ".claude", "skills", "codex-thing"))).toBe(
    join(root, "skills", "codex-thing"),
  );
  expect(readlinkSync(join(home, ".agents", "skills", "claude-thing"))).toBe(
    join(root, "skills", "claude-thing"),
  );
});

test("rejects empty only/exclude pattern lists", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = []",
      'skillSymlinks = [{ sourceRoot = "skills", only = [], targetRoots = [',
      '  "~/.claude/skills",',
      "] }]",
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
    "$.skillSymlinks[0].only: expected at least one glob pattern",
  );
});

test("cleanup replaces links whose planned source moved roots", () => {
  const home = createHome();
  const root = createRoot();
  for (const dir of ["skills", "thirdparty/skills"]) {
    mkdirSync(join(root, dir, "codex-thing"), { recursive: true });
    writeFileSync(join(root, dir, "codex-thing", "SKILL.md"), `# ${dir}\n`);
  }
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = []",
      "skillSymlinks = [",
      '  { sourceRoot = "skills", exclude = ["codex-*"], targetRoots = [',
      '    "~/.agents/skills",',
      "  ] },",
      '  { sourceRoot = "thirdparty/skills", targetRoots = [',
      '    "~/.agents/skills",',
      "  ] },",
      "]",
      "staleSymlinkCleanup = [",
      '  { sourceDir = "skills", targetDir = "~/.agents/skills" },',
      '  { sourceDir = "thirdparty/skills", targetDir = "~/.agents/skills" },',
      "]",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );
  const link = join(home, ".agents", "skills", "codex-thing");
  mkdirSync(join(home, ".agents", "skills"), { recursive: true });
  symlinkSync(join(root, "skills", "codex-thing"), link);

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(0);
  expect(readlinkSync(link)).toBe(
    join(root, "thirdparty", "skills", "codex-thing"),
  );
});

test("repo config excludes Codex wrappers from skill roots", () => {
  const home = createHome();
  const staleCodexReview = join(home, ".claude", "skills", "codex-review");
  mkdirSync(join(home, ".claude", "skills"), { recursive: true });
  symlinkSync(join(rootDir, "skills", "codex-review"), staleCodexReview);

  const result = run(home);

  expect(result.status).toBe(0);
  expect(existsSync(staleCodexReview)).toBe(false);
  expect(existsSync(join(home, ".agents", "skills", "codex-review"))).toBe(
    false,
  );
  expect(readlinkSync(join(home, ".agents", "skills", "claude-review"))).toBe(
    join(rootDir, "skills", "claude-review"),
  );
  expect(existsSync(join(home, ".claude", "skills", "claude-review"))).toBe(
    false,
  );
  expect(
    lstatSync(join(home, ".agents", "skills", "commit")).isSymbolicLink(),
  ).toBe(true);
  expect(
    lstatSync(join(home, ".claude", "skills", "commit")).isSymbolicLink(),
  ).toBe(true);
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
