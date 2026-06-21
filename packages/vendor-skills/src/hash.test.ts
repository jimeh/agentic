import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { contentHash } from "./hash";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "agentic-hash-test-"));
  tempDirs.push(dir);
  return dir;
}

test("contentHash is stable for identical file content", () => {
  const first = tempDir();
  const second = tempDir();

  writeFileSync(join(first, "a.txt"), "hello");
  writeFileSync(join(second, "a.txt"), "hello");

  expect(contentHash(first)).toBe(contentHash(second));
});

test("contentHash ignores .git and node_modules directories", () => {
  const dir = tempDir();

  writeFileSync(join(dir, "a.txt"), "hello");
  const before = contentHash(dir);

  mkdirSync(join(dir, ".git"), { recursive: true });
  mkdirSync(join(dir, "node_modules", "pkg"), { recursive: true });
  writeFileSync(join(dir, ".git", "ignored"), "changed");
  writeFileSync(join(dir, "node_modules", "pkg", "ignored"), "changed");

  expect(contentHash(dir)).toBe(before);
});

test("contentHash frames paths and content without ambiguity", () => {
  const first = tempDir();
  const second = tempDir();

  writeFileSync(join(first, "a"), "bc");
  writeFileSync(join(second, "ab"), "c");

  expect(contentHash(first)).not.toBe(contentHash(second));
});
