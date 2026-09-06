import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Snapshot, Target } from "./model";

export type State = {
  version: 1;
  target: Target;
  snapshot: Snapshot;
  lastKnownMergeState: string;
  lastResult: string | null;
};

export function sameTarget(a: Target, b: Target): boolean {
  return (
    a.host.toLowerCase() === b.host.toLowerCase() &&
    a.owner.toLowerCase() === b.owner.toLowerCase() &&
    a.repo.toLowerCase() === b.repo.toLowerCase() &&
    a.number === b.number
  );
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      mode: 0o600,
      flag: "wx",
    });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function readState(
  file: string,
  target: Target,
): Promise<State | null> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  try {
    const state = JSON.parse(text) as State;
    const snapshot = state.snapshot;
    if (
      state.version !== 1 ||
      !sameTarget(state.target, target) ||
      typeof snapshot.headSha !== "string" ||
      typeof snapshot.observedAt !== "string" ||
      typeof snapshot.url !== "string" ||
      typeof snapshot.draft !== "boolean" ||
      !["open", "closed", "merged"].includes(snapshot.state) ||
      typeof snapshot.mergeStateStatus !== "string" ||
      !(
        snapshot.reviewDecision === null ||
        typeof snapshot.reviewDecision === "string"
      ) ||
      typeof state.lastKnownMergeState !== "string" ||
      !(state.lastResult === null || typeof state.lastResult === "string") ||
      ![snapshot.checks, snapshot.feedback, snapshot.threads].every(
        (items) =>
          Array.isArray(items) &&
          items.every((item) => item && typeof item.id === "string"),
      ) ||
      !snapshot.checks.every(
        (check) =>
          ["pending", "passed", "failed"].includes(check.state) &&
          typeof check.name === "string",
      ) ||
      !snapshot.feedback.every(
        (item) =>
          typeof item.bodyHash === "string" &&
          typeof item.url === "string" &&
          typeof item.updatedAt === "string",
      ) ||
      !snapshot.threads.every(
        (thread) =>
          typeof thread.resolved === "boolean" &&
          typeof thread.outdated === "boolean",
      )
    ) {
      throw new Error("invalid state");
    }
    return state;
  } catch {
    throw new Error(
      `Invalid or mismatched monitor state: ${file}. Inspect it or use a new --state-file; it has not been reset.`,
    );
  }
}

/** One observer owns a cursor at a time. Never steal locks based only on age. */
export async function lockState(file: string): Promise<() => Promise<void>> {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const lock = `${file}.lock`;
  let handle;
  try {
    handle = await open(lock, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(
        `Monitor state is locked: ${lock}. Use a separate --state-file for another observer. Remove a stale lock only after verifying its PID is no longer running.`,
      );
    }
    throw error;
  }
  try {
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
  } catch (error) {
    await rm(lock, { force: true });
    throw error;
  } finally {
    await handle.close();
  }
  return () => rm(lock, { force: true });
}
