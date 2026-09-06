export type Target = {
  host: string;
  owner: string;
  repo: string;
  number: number;
};

export type Check = {
  id: string;
  name: string;
  state: "pending" | "passed" | "failed";
  conclusion: string | null;
  url: string | null;
};

export type Feedback = {
  id: string;
  kind: "comment" | "inline_comment" | "review";
  author: string;
  url: string;
  updatedAt: string;
  bodyHash: string;
  commitSha: string | null;
  reviewState: string | null;
};

export type Thread = {
  id: string;
  resolved: boolean;
  outdated: boolean;
  path: string;
  line: number | null;
  url: string | null;
};

export type Snapshot = {
  observedAt: string;
  url: string;
  headSha: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  reviewDecision: string | null;
  mergeStateStatus: string;
  checks: Check[];
  feedback: Feedback[];
  threads: Thread[];
};

export type Change = {
  kind:
    | "head_changed"
    | "pr_changed"
    | "review_decision_changed"
    | "merge_state_changed"
    | "checks_failed"
    | "checks_completed"
    | "feedback_changed"
    | "threads_changed";
  ids?: string[];
};

function changedIds<T extends { id: string }>(
  before: T[],
  after: T[],
): string[] {
  const old = new Map(before.map((item) => [item.id, JSON.stringify(item)]));
  const current = new Map(after.map((item) => [item.id, JSON.stringify(item)]));
  return [...new Set([...old.keys(), ...current.keys()])]
    .filter((id) => old.get(id) !== current.get(id))
    .sort();
}

export function checksComplete(checks: Check[]): boolean {
  return (
    checks.length > 0 && checks.every((check) => check.state !== "pending")
  );
}

export function changesBetween(
  previous: Snapshot,
  current: Snapshot,
): Change[] {
  const changes: Change[] = [];
  if (previous.headSha !== current.headSha) {
    changes.push({ kind: "head_changed" });
  } else {
    const failed = changedIds(previous.checks, current.checks).filter((id) =>
      current.checks.some(
        (check) => check.id === id && check.state === "failed",
      ),
    );
    if (failed.length) changes.push({ kind: "checks_failed", ids: failed });
    // A job re-run only wakes the caller once it completes again.
    if (
      checksComplete(current.checks) &&
      (!checksComplete(previous.checks) ||
        changedIds(previous.checks, current.checks).length)
    ) {
      changes.push({ kind: "checks_completed" });
    }
  }
  if (previous.state !== current.state || previous.draft !== current.draft) {
    changes.push({ kind: "pr_changed" });
  }
  if (previous.reviewDecision !== current.reviewDecision) {
    changes.push({ kind: "review_decision_changed" });
  }
  if (
    current.mergeStateStatus !== "UNKNOWN" &&
    previous.mergeStateStatus !== current.mergeStateStatus
  ) {
    changes.push({ kind: "merge_state_changed" });
  }
  for (const [kind, ids] of [
    ["feedback_changed", changedIds(previous.feedback, current.feedback)],
    ["threads_changed", changedIds(previous.threads, current.threads)],
  ] as const) {
    if (ids.length) changes.push({ kind, ids });
  }
  return changes;
}
