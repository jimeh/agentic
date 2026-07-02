import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dir, "..");
const script = join(import.meta.dir, "install-agent-configs.ts");
const bun = process.execPath;
let tempDirs: string[] = [];

function createHome(): string {
  const home = mkdtempSync(join(tmpdir(), "agentic-install-home-"));
  tempDirs.push(home);
  return home;
}

function run(home: string, args: string[] = []) {
  return spawnSync(bun, [script, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: home,
      PATH: "/usr/bin:/bin",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
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

test("skips unmanaged existing files unless force is set", () => {
  const home = createHome();
  const target = join(home, ".claude", "CLAUDE.md");
  mkdirSync(join(home, ".claude"), { recursive: true });
  writeFileSync(target, "custom\n");

  const result = run(home);

  expect(result.status).toBe(0);
  expect(lstatSync(target).isSymbolicLink()).toBe(false);
});
