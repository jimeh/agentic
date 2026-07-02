import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const script = join(import.meta.dir, "render-global-rules.ts");
let tempDirs: string[] = [];

function createProject(overlay: string): string {
  const root = mkdtempSync(join(tmpdir(), "agentic-rules-"));
  tempDirs.push(root);
  mkdirSync(join(root, "rules"), { recursive: true });
  writeFileSync(join(root, "rules", "base.md"), "# Base\n\nShared.\n");
  writeFileSync(join(root, "rules", "agents.md"), overlay);
  writeFileSync(join(root, "rules", "claude.md"), overlay);
  return root;
}

function run(args: string[], cwd: string) {
  return spawnSync("bun", [script, "--root", cwd, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

test("renders base rules into both targets", () => {
  const root = createProject("<!-- only comments -->\n");

  const result = run([], root);

  expect(result.status).toBe(0);
  expect(readFileSync(join(root, "generated", "AGENTS.md"), "utf8")).toContain(
    "# Base\n\nShared.\n",
  );
  expect(readFileSync(join(root, "generated", "CLAUDE.md"), "utf8")).toContain(
    "# Base\n\nShared.\n",
  );
});

test("appends non-empty overlays", () => {
  const root = createProject("<!-- comment -->\n\n## Target\n\nSpecific.\n");

  const result = run([], root);

  expect(result.status).toBe(0);
  expect(readFileSync(join(root, "generated", "AGENTS.md"), "utf8")).toContain(
    "# Base\n\nShared.\n\n## Target\n\nSpecific.\n",
  );
});

test("check fails when generated files are stale", () => {
  const root = createProject("## Target\n\nSpecific.\n");
  expect(run([], root).status).toBe(0);
  writeFileSync(join(root, "generated", "AGENTS.md"), "stale\n");

  const result = run(["--check"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("is stale");
});
