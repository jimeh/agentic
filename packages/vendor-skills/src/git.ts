import { spawnSync } from "node:child_process";
import { join } from "node:path";
import type { Exec, Source } from "./types";

/** Maximum time to wait for one git subprocess before failing. */
export const GIT_COMMAND_TIMEOUT_MS = 120_000;

/** Redact credentials and common token forms before logging command failures. */
export function redactSecrets(value: string): string {
  return value
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, "$1***@")
    .replace(/\b(?:gh[opsu]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)/g, "***")
    .replace(
      /\b(token|access_token|password|passwd|secret)=([^&\s]+)/gi,
      (_match, key) => `${key}=***`,
    );
}

/** Execute a command and return trimmed stdout, throwing on failure. */
export const realExec: Exec = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: GIT_COMMAND_TIMEOUT_MS,
  });

  if (result.error || result.status !== 0) {
    const output = [result.error?.message, result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n");
    const safeCommand = `${command} ${args.map(redactSecrets).join(" ")}`;
    throw new Error(`${safeCommand} failed\n${redactSecrets(output)}`);
  }

  return result.stdout.trim();
};

/** Clone and check out a third-party skill source into a temporary directory. */
export function cloneSource(
  source: Source,
  tempRoot: string,
  cwd: string,
  exec: Exec,
  ref = source.ref,
  cloneName = source.id,
): string {
  const cloneDir = join(tempRoot, cloneName);
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
  exec("git", ["checkout", "--quiet", ref], cloneDir);
  return cloneDir;
}
