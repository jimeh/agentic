import type { Lock, LockEntry } from "./types";

/** Create an empty versioned third-party skills lockfile. */
export function createEmptyLock(): Lock {
  return {
    version: 1,
    skills: {},
  };
}

/** Create a lockfile with skill entries sorted by name. */
export function sortedLock(skills: Record<string, LockEntry>): Lock {
  return {
    version: 1,
    skills: Object.fromEntries(
      Object.entries(skills).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}
