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
import { dirname, join, resolve } from "node:path";
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
  expect(readlinkSync(join(home, ".codex", "AGENTS.md"))).toBe(
    join(rootDir, "generated", "CODEX.md"),
  );
  expect(readlinkSync(join(home, ".config", "opencode", "AGENTS.md"))).toBe(
    join(rootDir, "generated", "OPENCODE.md"),
  );
});

test("removes retired RTK rule symlinks", () => {
  const home = createHome();
  const claudeLink = join(home, ".claude", "RTK.md");
  const codexLink = join(home, ".codex", "RTK.md");
  mkdirSync(dirname(claudeLink), { recursive: true });
  mkdirSync(dirname(codexLink), { recursive: true });
  symlinkSync(join(rootDir, "rules", "rtk", "claude.md"), claudeLink);
  symlinkSync(join(rootDir, "rules", "rtk", "codex.md"), codexLink);

  const result = run(home);

  expect(result.status).toBe(0);
  expect(() => lstatSync(claudeLink)).toThrow();
  expect(() => lstatSync(codexLink)).toThrow();
});

test("removes the retired ~/.agents/AGENTS.md rule symlink", () => {
  const home = createHome();
  const legacy = join(home, ".agents", "AGENTS.md");
  mkdirSync(dirname(legacy), { recursive: true });
  symlinkSync(join(rootDir, "generated", "AGENTS.md"), legacy);

  const result = run(home);

  expect(result.status).toBe(0);
  expect(existsSync(legacy)).toBe(false);
});

test("removes managed agent symlinks whose source is gone", () => {
  const home = createHome();
  const agentsDir = join(home, ".claude", "agents");
  mkdirSync(agentsDir, { recursive: true });
  const orphan = join(agentsDir, "sol.md");
  symlinkSync(join(rootDir, "claude", "agents", "sol.md"), orphan);

  const result = run(home);

  expect(result.status).toBe(0);
  expect(() => lstatSync(orphan)).toThrow();
});

test("installs managed CLI wrapper symlinks", () => {
  const home = createHome();

  const result = run(home);

  expect(result.status).toBe(0);
  expect(readlinkSync(join(home, ".local", "bin", "clide"))).toBe(
    join(rootDir, "bin", "clide"),
  );
  expect(readlinkSync(join(home, ".local", "bin", "claudex"))).toBe(
    join(rootDir, "bin", "claudex"),
  );
  expect(readlinkSync(join(home, ".local", "bin", "fable"))).toBe(
    join(rootDir, "bin", "fable"),
  );
  expect(readlinkSync(join(home, ".local", "bin", "opus"))).toBe(
    join(rootDir, "bin", "opus"),
  );
  expect(readlinkSync(join(home, ".local", "bin", "claude-headless"))).toBe(
    join(rootDir, "packages", "claude-headless", "bin", "claude-headless.ts"),
  );
});

test("relinks claude-headless from its former package without force", () => {
  const home = createHome();
  const binDir = join(home, ".local", "bin");
  const link = join(binDir, "claude-headless");
  mkdirSync(binDir, { recursive: true });
  symlinkSync(
    join(rootDir, "packages", "agent-config", "bin", "claude-headless.ts"),
    link,
  );

  const result = run(home);

  expect(result.status).toBe(0);
  expect(readlinkSync(link)).toBe(
    join(rootDir, "packages", "claude-headless", "bin", "claude-headless.ts"),
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

test("relinks a managed link whose in-repo source moved, without force", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(join(root, "current.md"), "current\n");
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = [{",
      '  source = "current.md",',
      '  target = "~/.claude/thing.md",',
      '  relinkFrom = ["moved-away.md"],',
      "}]",
      "skillSymlinks = []",
      // Deliberately empty: linking must heal the link on its own, without
      // relying on a staleSymlinkCleanup entry covering this target.
      "staleSymlinkCleanup = []",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );
  const link = join(home, ".claude", "thing.md");
  mkdirSync(join(home, ".claude"), { recursive: true });
  // Points at a path inside the repo that no longer exists, exactly as a
  // previous install would leave it after the source moved.
  symlinkSync(join(root, "moved-away.md"), link);

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(0);
  expect(readlinkSync(link)).toBe(join(root, "current.md"));
});

test("leaves a link pointing outside the repo alone without force", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(join(root, "current.md"), "current\n");
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      'symlinks = [{ source = "current.md", target = "~/.claude/thing.md" }]',
      "skillSymlinks = []",
      "staleSymlinkCleanup = []",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );
  const outside = join(home, "my-own-notes.md");
  writeFileSync(outside, "mine\n");
  const link = join(home, ".claude", "thing.md");
  mkdirSync(join(home, ".claude"), { recursive: true });
  symlinkSync(outside, link);

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(0);
  expect(readlinkSync(link)).toBe(outside);
});

test("leaves an undeclared in-repo link alone without force", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(join(root, "current.md"), "current\n");
  writeFileSync(join(root, "my-own-notes.md"), "mine\n");
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      'symlinks = [{ source = "current.md", target = "~/.claude/thing.md" }]',
      "skillSymlinks = []",
      "staleSymlinkCleanup = []",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );
  const link = join(home, ".claude", "thing.md");
  mkdirSync(join(home, ".claude"), { recursive: true });
  symlinkSync(join(root, "my-own-notes.md"), link);

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(0);
  expect(readlinkSync(link)).toBe(join(root, "my-own-notes.md"));
  expect(result.stderr).toContain("already exists, use --force");
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

test("relinks a skill forked from thirdparty into the first-party root", () => {
  const home = createHome();
  const root = createRoot();
  mkdirSync(join(root, "skills", "forked-thing"), { recursive: true });
  writeFileSync(join(root, "skills", "forked-thing", "SKILL.md"), "# forked\n");
  mkdirSync(join(root, "thirdparty", "skills", "other-thing"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "thirdparty", "skills", "other-thing", "SKILL.md"),
    "# other\n",
  );
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = []",
      "skillSymlinks = [",
      '  { sourceRoot = "skills", targetRoots = ["~/.claude/skills"] },',
      '  { sourceRoot = "thirdparty/skills", targetRoots = [',
      '    "~/.claude/skills",',
      "  ] },",
      "]",
      "staleSymlinkCleanup = [",
      '  { sourceDir = "skills", targetDir = "~/.claude/skills" },',
      '  { sourceDir = "thirdparty/skills", targetDir = "~/.claude/skills" },',
      "]",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );
  // The link the previous install left behind, pointing at the vendored copy
  // that the fork deleted.
  const link = join(home, ".claude", "skills", "forked-thing");
  mkdirSync(join(home, ".claude", "skills"), { recursive: true });
  symlinkSync(join(root, "thirdparty", "skills", "forked-thing"), link);

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(0);
  expect(readlinkSync(link)).toBe(join(root, "skills", "forked-thing"));
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

test("rejects empty relinkFrom source lists", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(join(root, "current.md"), "current\n");
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = [{",
      '  source = "current.md",',
      '  target = "~/.claude/thing.md",',
      "  relinkFrom = [],",
      "}]",
      "skillSymlinks = []",
      "staleSymlinkCleanup = []",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "$.symlinks[0].relinkFrom: expected at least one source path",
  );
});

test("rejects empty relinkFrom source entries", () => {
  const home = createHome();
  const root = createRoot();
  writeFileSync(join(root, "current.md"), "current\n");
  writeFileSync(
    join(root, "agent-config.toml"),
    [
      "symlinks = [{",
      '  source = "current.md",',
      '  target = "~/.claude/thing.md",',
      '  relinkFrom = [""],',
      "}]",
      "skillSymlinks = []",
      "staleSymlinkCleanup = []",
      "[claude]",
      "marketplaces = []",
      "plugins = []",
      "",
    ].join("\n"),
  );

  const result = run(home, ["--root", root]);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain(
    "$.symlinks[0].relinkFrom[0]: expected non-empty string",
  );
});

for (const source of [
  "/outside.md",
  "../outside.md",
  "nested/../../outside.md",
  "C:\\outside.md",
  "\\\\server\\share\\outside.md",
]) {
  test(`rejects unsafe relinkFrom source ${JSON.stringify(source)}`, () => {
    const home = createHome();
    const root = createRoot();
    writeFileSync(join(root, "current.md"), "current\n");
    writeFileSync(
      join(root, "agent-config.toml"),
      [
        "symlinks = [{",
        '  source = "current.md",',
        '  target = "~/.claude/thing.md",',
        `  relinkFrom = [${JSON.stringify(source)}],`,
        "}]",
        "skillSymlinks = []",
        "staleSymlinkCleanup = []",
        "[claude]",
        "marketplaces = []",
        "plugins = []",
        "",
      ].join("\n"),
    );

    const result = run(home, ["--root", root]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "$.symlinks[0].relinkFrom[0]: expected repo-relative path without .. segments",
    );
  });
}

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

test("repo config scopes executor wrappers to the other skill root", () => {
  const home = createHome();

  const result = run(home);

  expect(result.status).toBe(0);
  expect(readlinkSync(join(home, ".claude", "skills", "codex-review"))).toBe(
    join(rootDir, "skills", "codex-review"),
  );
  expect(existsSync(join(home, ".agents", "skills", "codex-review"))).toBe(
    false,
  );
  for (const skill of [
    "claude-analysis",
    "claude-first",
    "claude-implementation",
    "claude-review",
  ]) {
    expect(readlinkSync(join(home, ".agents", "skills", skill))).toBe(
      join(rootDir, "skills", skill),
    );
    expect(existsSync(join(home, ".claude", "skills", skill))).toBe(false);
  }
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
