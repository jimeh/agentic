import type { Snapshot } from "./model";

export const conditionNames = [
  "checks-finished",
  "checks-pass",
  "review-finished",
  "review-approved",
  "threads-resolved",
  "feedback-received",
  "non-draft",
  "mergeable",
  "merged",
  "closed",
] as const;
export type ConditionName = (typeof conditionNames)[number];
export type Goal = {
  conditions: ConditionName[];
  checks: "required" | "all" | string[];
  reviewer?: string;
  since?: string;
  head?: string;
  ignoreOutdated: boolean;
};
export type RequiredCheck = { name: string; appId: number | null };
export type GoalObservation = {
  snapshot: Snapshot;
  mergeable: string;
  requiredChecks: RequiredCheck[] | null;
  reviewSubmittedAt: Record<string, string | null>;
};
export type ConditionResult = {
  name: ConditionName;
  status: "met" | "not_met" | "unknown";
  reason: string;
  evidenceIds: string[];
  attention?: boolean;
};
export type Evaluation = {
  satisfied: boolean | null;
  status: "met" | "not_met" | "unknown";
  conditions: ConditionResult[];
};

export function validateGoal(goal: Goal): void {
  if (
    !goal.conditions.length ||
    goal.conditions.some((c) => !conditionNames.includes(c))
  )
    throw new Error("Supply one or more supported --until conditions");
  if (
    goal.conditions.some((c) => c.startsWith("review-")) &&
    !goal.reviewer?.trim()
  )
    throw new Error("Review conditions require --reviewer LOGIN");
  if (goal.conditions.includes("feedback-received") && !goal.since)
    throw new Error("feedback-received requires --since ISO_TIMESTAMP");
  if (
    goal.since &&
    (!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(goal.since) ||
      !Number.isFinite(Date.parse(goal.since)))
  )
    throw new Error("--since must be an ISO timestamp with timezone");
  if (goal.head && !/^[a-f0-9]{40}$/i.test(goal.head))
    throw new Error("--head must be a full 40-character commit SHA");
  if (
    Array.isArray(goal.checks) &&
    (!goal.checks.length || goal.checks.some((c) => !c.trim()))
  )
    throw new Error("Check names must not be empty");
}

function author(login: string): string {
  return login.toLowerCase().replace(/\[bot\]$/, "");
}

/** Evaluate structured GitHub evidence without interpreting review text. */
export async function evaluateGoal(
  observation: GoalObservation,
  goal: Goal,
  signal: AbortSignal,
): Promise<Evaluation> {
  signal.throwIfAborted();
  validateGoal(goal);
  const { snapshot: s } = observation;
  const conditions: ConditionResult[] = [];
  for (const name of goal.conditions) {
    const result = (
      status: ConditionResult["status"],
      reason: string,
      evidenceIds: string[] = [],
      attention = false,
    ) => {
      conditions.push({
        name,
        status,
        reason,
        evidenceIds,
        ...(attention ? { attention } : {}),
      });
    };
    if (goal.head && s.headSha.toLowerCase() !== goal.head.toLowerCase()) {
      result(
        "not_met",
        "The PR head changed from the requested commit",
        [],
        true,
      );
      continue;
    }
    if (name === "checks-pass" || name === "checks-finished") {
      const expected =
        goal.checks === "required"
          ? observation.requiredChecks
          : goal.checks === "all"
            ? s.checks.map((c) => ({ name: c.name, appId: c.appId ?? null }))
            : goal.checks.map((n) => ({ name: n, appId: null }));
      if (!expected?.length) {
        result(
          "unknown",
          expected === null
            ? "Required-check metadata is unavailable"
            : "No checks are selected or registered; absence does not establish success",
        );
        continue;
      }
      const matches = expected.map((e) =>
        s.checks.filter(
          (c) => c.name === e.name && (e.appId === null || c.appId === e.appId),
        ),
      );
      const selected = matches.flat();
      if (
        name === "checks-pass" &&
        selected.some((c) => c.state === "failed")
      ) {
        result(
          "not_met",
          "A selected check failed",
          selected.filter((c) => c.state === "failed").map((c) => c.id),
          true,
        );
        continue;
      }
      const unknownSources = expected.flatMap((e) =>
        e.appId !== null
          ? s.checks.filter(
              (c) =>
                c.name === e.name &&
                c.id.startsWith("status:") &&
                c.appId == null,
            )
          : [],
      );
      if (unknownSources.length) {
        result(
          "unknown",
          "A required check is bound to a GitHub App, but the matching commit status has no app identity available",
          [...new Set(unknownSources.map((c) => c.id))],
        );
        continue;
      }
      if (matches.some((m) => !m.length)) {
        result(
          "not_met",
          "An expected check has not appeared",
          selected.map((c) => c.id),
        );
        continue;
      }
      if (selected.some((c) => c.state === "pending")) {
        result(
          "not_met",
          "Selected checks are still running",
          selected.map((c) => c.id),
        );
        continue;
      }
      // Goal success is stricter than the legacy monitor's passed bucket: skipped and neutral are explicit outcomes.
      if (
        name === "checks-pass" &&
        selected.some((c) => c.conclusion !== "success")
      ) {
        result(
          "not_met",
          "A selected check did not conclude success (including skipped or neutral)",
          selected.map((c) => c.id),
          true,
        );
        continue;
      }
      result(
        "met",
        name === "checks-pass"
          ? "Every selected check succeeded"
          : "Every selected check finished",
        selected.map((c) => c.id),
      );
      continue;
    }
    if (name === "review-finished" || name === "review-approved") {
      const submittedAt = (id: string) =>
        Date.parse(observation.reviewSubmittedAt[id] ?? "");
      const reviews = s.feedback
        .filter(
          (f) =>
            f.kind === "review" &&
            f.reviewState !== "PENDING" &&
            f.commitSha?.toLowerCase() === s.headSha.toLowerCase() &&
            author(f.author) === author(goal.reviewer!) &&
            Number.isFinite(submittedAt(f.id)) &&
            (!goal.since || submittedAt(f.id) > Date.parse(goal.since)),
        )
        .sort(
          (a, b) =>
            submittedAt(b.id) - submittedAt(a.id) ||
            b.id.localeCompare(a.id, "en", { numeric: true }),
        );
      // Comments do not replace an approval or changes-requested decision.
      // Dismissal invalidates that decision until another explicit decision arrives.
      const latest =
        name === "review-approved"
          ? reviews.find((r) => r.reviewState !== "COMMENTED")
          : reviews[0];
      if (!latest) {
        result(
          "not_met",
          name === "review-approved"
            ? "No effective approval from the selected reviewer on this head in this time window"
            : "No submitted review from the selected reviewer on this head in this time window",
        );
        continue;
      }
      const ids = [latest.id];
      if (latest.reviewState === "DISMISSED") {
        result(
          "not_met",
          "The latest applicable review was dismissed",
          ids,
          true,
        );
        continue;
      }
      if (
        ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"].includes(
          latest.reviewState ?? "",
        )
      ) {
        result(
          name === "review-finished" || latest.reviewState === "APPROVED"
            ? "met"
            : "not_met",
          `The reviewer submitted ${latest.reviewState} on this head`,
          ids,
          latest.reviewState === "CHANGES_REQUESTED",
        );
        continue;
      }
      result(
        "unknown",
        "GitHub returned an unsupported review state",
        ids,
        true,
      );
      continue;
    }
    if (name === "threads-resolved") {
      const unresolved = s.threads.filter(
        (t) => !t.resolved && !(goal.ignoreOutdated && t.outdated),
      );
      result(
        unresolved.length ? "not_met" : "met",
        unresolved.length
          ? "Selected threads remain unresolved"
          : "All selected threads are resolved",
        unresolved.map((t) => t.id),
      );
      continue;
    }
    if (name === "feedback-received") {
      const feedback = s.feedback.filter(
        (f) =>
          Date.parse(f.updatedAt) > Date.parse(goal.since!) &&
          (!goal.reviewer || author(f.author) === author(goal.reviewer)),
      );
      result(
        feedback.length ? "met" : "not_met",
        feedback.length
          ? "Feedback arrived or changed after the baseline time"
          : "No feedback after the baseline time",
        feedback.map((f) => f.id),
      );
      continue;
    }
    if (name === "mergeable") {
      result(
        observation.mergeable === "UNKNOWN"
          ? "unknown"
          : observation.mergeable === "MERGEABLE"
            ? "met"
            : "not_met",
        `GitHub mergeability: ${observation.mergeable}`,
      );
      continue;
    }
    const met = name === "non-draft" ? !s.draft : s.state === name;
    result(
      met ? "met" : "not_met",
      name === "non-draft"
        ? s.draft
          ? "PR is draft"
          : "PR is non-draft"
        : `PR is ${s.state}`,
    );
  }
  const status = conditions.some((c) => c.status === "not_met")
    ? "not_met"
    : conditions.some((c) => c.status === "unknown")
      ? "unknown"
      : "met";
  return {
    satisfied: status === "unknown" ? null : status === "met",
    status,
    conditions,
  };
}
