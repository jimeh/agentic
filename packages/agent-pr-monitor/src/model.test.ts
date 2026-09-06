import { describe, expect, test } from "bun:test";
import {
  changesBetween,
  type Check,
  type Feedback,
  type Snapshot,
} from "./model";

export function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    observedAt: "2026-09-06T12:00:00Z",
    url: "https://github.com/owner/repo/pull/1",
    headSha: "a".repeat(40),
    state: "open",
    draft: false,
    reviewDecision: null,
    mergeStateStatus: "BLOCKED",
    checks: [],
    feedback: [],
    threads: [],
    ...overrides,
  };
}

export function check(id: string, state: Check["state"] = "pending"): Check {
  return { id, name: id, state, conclusion: null, url: null };
}

export function feedback(
  id: string,
  overrides: Partial<Feedback> = {},
): Feedback {
  return {
    id,
    kind: "review",
    author: "reviewer",
    url: `https://github.com/owner/repo/pull/1#${id}`,
    updatedAt: "2026-09-06T12:00:00Z",
    bodyHash: "original",
    commitSha: "a".repeat(40),
    reviewState: "COMMENTED",
    ...overrides,
  };
}

describe("meaningful changes", () => {
  test("stays quiet for identical observations and successful intermediate jobs", () => {
    const before = snapshot({ checks: [check("a"), check("b")] });
    expect(changesBetween(before, { ...before, observedAt: "later" })).toEqual(
      [],
    );
    expect(
      changesBetween(
        before,
        snapshot({ checks: [check("a", "passed"), check("b")] }),
      ),
    ).toEqual([]);
  });

  test("reports a failed job immediately while other jobs are pending", () => {
    const before = snapshot({ checks: [check("a"), check("b")] });
    const after = snapshot({ checks: [check("a", "failed"), check("b")] });
    expect(changesBetween(before, after)).toEqual([
      { kind: "checks_failed", ids: ["a"] },
    ]);
    expect(changesBetween(after, after)).toEqual([]);
  });

  test("reports completion, stays quiet during a re-run, and never calls an empty check set complete", () => {
    const pending = snapshot({ checks: [check("a")] });
    const complete = snapshot({ checks: [check("a", "passed")] });
    expect(changesBetween(pending, complete)).toEqual([
      { kind: "checks_completed" },
    ]);
    expect(changesBetween(complete, pending)).toEqual([]);
    expect(changesBetween(snapshot(), snapshot())).toEqual([]);
    expect(changesBetween(complete, snapshot())).toEqual([]);
  });

  test("does not compare check results across heads", () => {
    const before = snapshot({ checks: [check("a", "failed")] });
    const after = snapshot({
      headSha: "b".repeat(40),
      checks: [check("a", "passed")],
    });
    expect(changesBetween(before, after)).toEqual([{ kind: "head_changed" }]);
  });

  test("detects new, edited, dismissed, and deleted feedback without replaying history", () => {
    const before = snapshot({
      feedback: [feedback("old"), feedback("edit"), feedback("dismiss")],
    });
    const after = snapshot({
      feedback: [
        feedback("old"),
        feedback("edit", { bodyHash: "edited" }),
        feedback("dismiss", { reviewState: "DISMISSED" }),
        feedback("new"),
      ],
    });
    expect(changesBetween(before, after)).toEqual([
      { kind: "feedback_changed", ids: ["dismiss", "edit", "new"] },
    ]);
    expect(
      changesBetween(after, snapshot({ feedback: [feedback("old")] })),
    ).toEqual([{ kind: "feedback_changed", ids: ["dismiss", "edit", "new"] }]);
  });

  test("detects resolution and reopening even for outdated threads", () => {
    const thread = {
      id: "thread",
      resolved: false,
      outdated: true,
      path: "src/a.ts",
      line: null,
      url: null,
    };
    const before = snapshot({ threads: [thread] });
    const after = snapshot({ threads: [{ ...thread, resolved: true }] });
    expect(changesBetween(before, after)).toEqual([
      { kind: "threads_changed", ids: ["thread"] },
    ]);
    expect(changesBetween(after, before)).toEqual([
      { kind: "threads_changed", ids: ["thread"] },
    ]);
  });

  test("ignores API ordering and transient unknown mergeability", () => {
    const before = snapshot({
      checks: [check("a"), check("b")],
      feedback: [feedback("1"), feedback("2")],
    });
    const after = {
      ...before,
      checks: [...before.checks].reverse(),
      feedback: [...before.feedback].reverse(),
      mergeStateStatus: "UNKNOWN",
    };
    expect(changesBetween(before, after)).toEqual([]);
  });
});
