import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";
import { discoverPluginTests, runPluginTests } from "./plugin-tests";

function createPluginTest(root: string, plugin: string, name: string): string {
  const testsDir = join(root, "plugins", plugin, "tests");
  mkdirSync(testsDir, { recursive: true });
  const testFile = join(testsDir, name);
  writeFileSync(testFile, "#!/usr/bin/env bash\nexit 0\n");
  return testFile;
}

function withTempRepo<T>(callback: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "agentic-plugin-tests-"));

  try {
    return callback(root);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

describe("discoverPluginTests", () => {
  test("finds plugin shell tests in deterministic order", () => {
    withTempRepo((root) => {
      const second = createPluginTest(root, "beta", "second.test.sh");
      const first = createPluginTest(root, "alpha", "first.test.sh");

      expect(discoverPluginTests(root)).toEqual([first, second]);
    });
  });
});

describe("runPluginTests", () => {
  test("returns zero when no plugin tests exist", () => {
    withTempRepo((root) => {
      const output = {
        text: "",
        write: (text: string) => (output.text += text),
      };

      expect(
        runPluginTests({
          rootDir: root,
          stderr: output as never,
          stdout: output as never,
          stdio: "pipe",
        }),
      ).toBe(0);
      expect(output.text).toContain("No plugin tests found.");
    });
  });

  test("includes spawn error details when the shell cannot launch", () => {
    withTempRepo((root) => {
      createPluginTest(root, "alpha", "pass.test.sh");

      const output = {
        text: "",
        write: (text: string) => (output.text += text),
      };

      expect(
        runPluginTests({
          bash: join(root, "missing-bash"),
          rootDir: root,
          stderr: output as never,
          stdout: output as never,
          stdio: "pipe",
        }),
      ).toBe(1);
      expect(output.text).toMatch(/test failed: .*(ENOENT|No such file)/);
    });
  });

  test("returns non-zero when a plugin test fails", () => {
    withTempRepo((root) => {
      createPluginTest(root, "alpha", "pass.test.sh");
      const failing = createPluginTest(root, "beta", "fail.test.sh");
      writeFileSync(failing, "#!/usr/bin/env bash\nexit 1\n");

      const output = {
        text: "",
        write: (text: string) => (output.text += text),
      };

      expect(
        runPluginTests({
          rootDir: root,
          stderr: output as never,
          stdout: output as never,
          stdio: "pipe",
        }),
      ).toBe(1);
      expect(output.text).toContain("plugins/alpha/tests/pass.test.sh");
      expect(output.text).toContain("test failed");
    });
  });
});
