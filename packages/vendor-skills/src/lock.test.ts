import { expect, test } from "bun:test";
import type { LockEntry } from "./types";
import { sortedLock } from "./lock";

function entry(name: string): LockEntry {
  return {
    manifestSourceId: "source",
    sourceType: "git",
    sourceUrl: "/tmp/upstream",
    ref: "main",
    resolvedCommit: "abc123",
    upstreamPath: `skills/${name}`,
    contentHash: `sha256:${name}`,
    skillsCliVersion: null,
  };
}

test("sortedLock sorts skill entries by name", () => {
  const lock = sortedLock({
    zed: entry("zed"),
    alpha: entry("alpha"),
  });

  expect(Object.keys(lock.skills)).toEqual(["alpha", "zed"]);
});
