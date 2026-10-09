export type Target = {
  host: string;
  owner: string;
  repo: string;
  number: number;
};

export type Check = {
  appId?: number | null;
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
  /** Login that opened the thread; absent in cursors written before it was recorded. */
  author?: string | null;
};

export type Snapshot = {
  observedAt: string;
  url: string;
  /** Login the token authenticates as; absent in cursors written before it was recorded. */
  viewer?: string | null;
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
    | "merge_conflict"
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

/** GraphQL omits the `[bot]` suffix that REST and users include. */
export function normalizeLogin(login: string): string {
  return login.toLowerCase().replace(/\[bot\]$/, "");
}

/** The caller's own comments, replies, and reviews are not news to it. */
export function feedbackFromOthers(
  feedback: Feedback[],
  viewer: string | null | undefined,
): Feedback[] {
  if (!viewer) return feedback;
  const own = normalizeLogin(viewer);
  return feedback.filter((item) => normalizeLogin(item.author) !== own);
}

/**
 * A thread the caller opens or deletes is its own feedback. A change to a thread
 * that stays, such as a resolution, is reported whoever opened the thread.
 */
function changedThreadIds(previous: Snapshot, current: Snapshot): string[] {
  // The opener is left out of the comparison so older cursors match.
  const state = ({ author: _author, ...thread }: Thread) => thread;
  const ids = changedIds(
    previous.threads.map(state),
    current.threads.map(state),
  );
  if (!current.viewer) return ids;
  const own = normalizeLogin(current.viewer);
  const before = new Map(previous.threads.map((thread) => [thread.id, thread]));
  const after = new Map(current.threads.map((thread) => [thread.id, thread]));
  return ids.filter((id) => {
    const [old, now] = [before.get(id), after.get(id)];
    if (old && now) return true;
    const author = (old ?? now)?.author;
    return !author || normalizeLogin(author) !== own;
  });
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
  // Draft state, review decision, and other merge states are summarized in each
  // result but do not wake the caller: they mostly restate events reported here.
  if (previous.state !== current.state) changes.push({ kind: "pr_changed" });
  if (
    current.mergeStateStatus === "DIRTY" &&
    previous.mergeStateStatus !== "DIRTY"
  ) {
    changes.push({ kind: "merge_conflict" });
  }
  for (const [kind, ids] of [
    [
      "feedback_changed",
      changedIds(
        feedbackFromOthers(previous.feedback, current.viewer),
        feedbackFromOthers(current.feedback, current.viewer),
      ),
    ],
    ["threads_changed", changedThreadIds(previous, current)],
  ] as const) {
    if (ids.length) changes.push({ kind, ids });
  }
  return changes;
}
