import { spawnSync } from "node:child_process";
import { join } from "node:path";
import type { Exec, Source } from "./types";

/** Execute a command and return trimmed stdout, throwing on failure. */
export const realExec: Exec = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }

  return result.stdout.trim();
};

/** Clone and check out a third-party skill source into a temporary directory. */
export function cloneSource(
  source: Source,
  tempRoot: string,
  cwd: string,
  exec: Exec,
): string {
  const cloneDir = join(tempRoot, source.id);
  exec(
    "git",
    [
      "clone",
      "--quiet",
      "--filter=blob:none",
      "--no-checkout",
      source.url,
      cloneDir,
    ],
    cwd,
  );
  exec("git", ["checkout", "--quiet", source.ref], cloneDir);
  return cloneDir;
}
