import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import type { Manifest } from "./types";

/** Temporary repository pair used by updater integration tests. */
export type TempProject = {
  root: string;
  upstream: string;
  initialCommit: string;
  cleanup(): void;
};

/** Run a subprocess in tests and throw with output on failure. */
export function run(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout}${result.stderr}`,
    );
  }

  return result.stdout.trim();
}

/** Write a test file, creating parent directories first. */
export function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/** Read and parse a JSON file in tests. */
export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Create a temporary project with a local git upstream fixture. */
export function createTempProject(): TempProject {
  const root = mkdtempSync(join(tmpdir(), "agentic-vendor-project-"));
  const upstream = mkdtempSync(join(tmpdir(), "agentic-vendor-upstream-"));

  run("git", ["init", "--quiet"], upstream);
  run("git", ["config", "user.name", "Test User"], upstream);
  run("git", ["config", "user.email", "test@example.com"], upstream);
  write(
    join(upstream, "skills", "example-skill", "SKILL.md"),
    [
      "---",
      "name: example-skill",
      "description: Example skill",
      "---",
      "",
      "# Example Skill",
      "",
    ].join("\n"),
  );
  write(join(upstream, "skills", "example-skill", "README.md"), "hello\n");
  write(
    join(upstream, "skills", "second-skill", "SKILL.md"),
    [
      "---",
      "name: second-skill",
      "description: Second skill",
      "---",
      "",
      "# Second Skill",
      "",
    ].join("\n"),
  );
  write(join(upstream, "skills", "second-skill", "README.md"), "second\n");
  run("git", ["add", "."], upstream);
  run("git", ["commit", "--quiet", "-m", "add skill"], upstream);
  run("git", ["branch", "-M", "main"], upstream);
  const initialCommit = run("git", ["rev-parse", "HEAD"], upstream);

  const manifest: Manifest = {
    version: 1,
    sources: [
      {
        id: "test-source",
        type: "git",
        url: upstream,
        ref: "main",
        skills: [{ name: "example-skill", path: "skills/example-skill" }],
      },
    ],
  };
  write(
    join(root, "thirdparty", "skills.manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  return {
    root,
    upstream,
    initialCommit,
    cleanup() {
      if (existsSync(root)) {
        rmSync(root, { recursive: true, force: true });
      }
      if (existsSync(upstream)) {
        rmSync(upstream, { recursive: true, force: true });
      }
    },
  };
}
