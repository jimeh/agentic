import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";
import { discoverSkillTests, runSkillTests } from "./skill-tests";

function createSkillTest(
  root: string,
  skill: string,
  name: string,
  content = "#!/usr/bin/env bash\nexit 0\n",
  executable = true,
): string {
  const testFile = join(root, "skills", skill, "tests", name);
  mkdirSync(dirname(testFile), { recursive: true });
  writeFileSync(testFile, content, { mode: executable ? 0o755 : 0o644 });
  return testFile;
}

function withTempRepo<T>(callback: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "agentic-skill-tests-"));

  try {
    return callback(root);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
}

function outputStream(): { text: string; write: (text: string) => void } {
  const output = {
    text: "",
    write: (text: string) => {
      output.text += text;
    },
  };
  return output;
}

describe("discoverSkillTests", () => {
  test("finds nested tests with any extension in deterministic order", () => {
    withTempRepo((root) => {
      const second = createSkillTest(
        root,
        "beta",
        "nested/second.test.integration.py",
      );
      const first = createSkillTest(root, "alpha", "first.test.sh");
      createSkillTest(root, "alpha", "ignored.sh");

      expect(discoverSkillTests(root)).toEqual([first, second]);
    });
  });
});

describe("runSkillTests", () => {
  test("fails when no skill tests exist", () => {
    withTempRepo((root) => {
      const output = outputStream();

      expect(
        runSkillTests({
          rootDir: root,
          stderr: output as never,
          stdout: output as never,
          stdio: "pipe",
        }),
      ).toBe(1);
      expect(output.text).toContain("No skill tests found");
    });
  });

  test("runs later interpreters after an earlier test fails", () => {
    withTempRepo((root) => {
      createSkillTest(
        root,
        "alpha",
        "fail.test.sh",
        "#!/usr/bin/env bash\nexit 1\n",
      );
      createSkillTest(
        root,
        "beta",
        "pass.test.py",
        '#!/usr/bin/env python3\nprint("PYTHON_PASS")\n',
      );
      const output = outputStream();

      expect(
        runSkillTests({
          rootDir: root,
          stderr: output as never,
          stdout: output as never,
          stdio: "pipe",
        }),
      ).toBe(1);
      expect(output.text).toContain("skills/alpha/tests/fail.test.sh");
      expect(output.text).toContain("PYTHON_PASS");
      expect(output.text).toContain("Ran 2 test file(s), 1 failed.");
    });
  });

  test("reports non-executable tests and continues", () => {
    withTempRepo((root) => {
      createSkillTest(root, "alpha", "blocked.test.sh", undefined, false);
      createSkillTest(
        root,
        "beta",
        "pass.test.sh",
        '#!/usr/bin/env bash\nprintf "LATER_PASS\\n"\n',
      );
      const output = outputStream();

      expect(
        runSkillTests({
          rootDir: root,
          stderr: output as never,
          stdout: output as never,
          stdio: "pipe",
        }),
      ).toBe(1);
      expect(output.text).toContain("test file is not executable");
      expect(output.text).toContain("LATER_PASS");
      expect(output.text).toContain("Ran 2 test file(s), 1 failed.");
    });
  });
});
