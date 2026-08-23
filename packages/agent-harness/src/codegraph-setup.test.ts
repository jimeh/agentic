import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dir, "../../..");
const miseConfig = Bun.TOML.parse(
  readFileSync(join(rootDir, "mise.toml"), "utf8"),
) as {
  tasks: Record<string, { run: string }>;
};
const command = miseConfig.tasks["codegraph:setup"].run;
let tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function runCodeGraphSetup(
  projectRoot: string,
  options: { exitCode?: number } = {},
) {
  const binDir = createTempDir("agentic-codegraph-bin-");
  const log = join(binDir, "calls.log");
  const codegraph = join(binDir, "codegraph");

  writeFileSync(
    codegraph,
    [
      "#!/usr/bin/env bash",
      'printf "%s\\n" "$*" >> "$CODEGRAPH_TEST_LOG"',
      'exit "${CODEGRAPH_TEST_EXIT:-0}"',
      "",
    ].join("\n"),
  );
  chmodSync(codegraph, 0o755);

  const result = spawnSync("/usr/bin/bash", ["-c", command], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      CODEGRAPH_TEST_EXIT: String(options.exitCode ?? 0),
      CODEGRAPH_TEST_LOG: log,
      PATH: `${binDir}:/usr/bin:/bin`,
    },
  });

  return {
    ...result,
    calls: existsSync(log) ? readFileSync(log, "utf8") : "",
  };
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { force: true, recursive: true });
  }
  tempDirs = [];
});

test("initializes CodeGraph when the project has no index", () => {
  const projectRoot = createTempDir("agentic-codegraph-project-");

  const result = runCodeGraphSetup(projectRoot);

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.calls).toBe("init\n");
});

test("invokes CodeGraph initialization when an index already exists", () => {
  const projectRoot = createTempDir("agentic-codegraph-project-");
  mkdirSync(join(projectRoot, ".codegraph"));

  const result = runCodeGraphSetup(projectRoot);

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.calls).toBe("init\n");
});

test("initializes when .codegraph is not a directory", () => {
  const projectRoot = createTempDir("agentic-codegraph-project-");
  writeFileSync(join(projectRoot, ".codegraph"), "not an index\n");

  const result = runCodeGraphSetup(projectRoot);

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(result.calls).toBe("init\n");
});

test("propagates CodeGraph initialization failures", () => {
  const projectRoot = createTempDir("agentic-codegraph-project-");
  mkdirSync(join(projectRoot, ".codegraph"));

  const result = runCodeGraphSetup(projectRoot, { exitCode: 23 });

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(23);
  expect(result.calls).toBe("init\n");
});
