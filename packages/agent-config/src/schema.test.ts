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

const cli = join(import.meta.dir, "..", "bin", "agent-config.ts");
const bun = process.execPath;
let tempDirs: string[] = [];

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "agentic-schema-"));
  tempDirs.push(root);
  return root;
}

function run(args: string[], cwd: string) {
  return spawnSync(bun, [cli, "schema", ...args, "--root", cwd], {
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

test("build writes agent config schema", () => {
  const root = createRoot();

  const result = run(["build"], root);

  expect(result.status).toBe(0);
  expect(
    JSON.parse(
      readFileSync(join(root, "schemas", "agent-config.schema.json"), "utf8"),
    ).title,
  ).toBe("Agent Config");
});

test("check fails when schema file is stale", () => {
  const root = createRoot();
  mkdirSync(join(root, "schemas"), { recursive: true });
  writeFileSync(join(root, "schemas", "agent-config.schema.json"), "{}\n");

  const result = run(["check"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("is stale");
});
