import { describe, expect, test } from "bun:test";
import { evaluateGoal, type Goal, type GoalObservation } from "./goals";
import { monitorGoal } from "./goal-monitor";
import { ObservationError } from "./github";

const sha = "a".repeat(40);
const signal = new AbortController().signal;
const check = {
  id: "build",
  name: "build",
  appId: 7,
  state: "passed" as const,
  conclusion: "success",
  url: null,
};
const review = {
  id: "review:1",
  kind: "review" as const,
  author: "bot[bot]",
  url: "https://github.com/o/r/pull/1#review1",
  updatedAt: "2026-09-19T12:00:00Z",
  bodyHash: "hash",
  commitSha: sha,
  reviewState: "APPROVED",
};
export function observation(): GoalObservation {
  return {
    snapshot: {
      headSha: sha,
      observedAt: "2026-09-19T12:01:00Z",
      url: "https://github.com/o/r/pull/1",
      state: "open",
      draft: false,
      reviewDecision: "APPROVED",
      mergeStateStatus: "CLEAN",
      checks: [check],
      feedback: [review],
      threads: [],
    },
    reviewSubmittedAt: { "review:1": review.updatedAt },
    mergeable: "MERGEABLE",
    requiredChecks: [{ name: "build", appId: 7 }],
  };
}
function goal(
  conditions: Goal["conditions"],
  overrides: Partial<Goal> = {},
): Goal {
  return {
    conditions,
    checks: "required",
    ignoreOutdated: false,
    reviewer: "bot",
    ...overrides,
  };
}
describe("goal evaluation", () => {
  test("composes explicit conditions on one head", async () => {
    const r = await evaluateGoal(
      observation(),
      goal([
        "checks-pass",
        "review-approved",
        "threads-resolved",
        "non-draft",
        "mergeable",
      ]),
      signal,
    );
    expect(r.satisfied).toBe(true);
    expect(r.conditions).toHaveLength(5);
  });
  test("missing required checks, absent metadata and app mismatches never pass", async () => {
    const o = observation();
    o.requiredChecks!.push({ name: "missing", appId: null });
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
    ).toBe(false);
    o.requiredChecks = null;
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
    ).toBeNull();
    o.requiredChecks = [{ name: "build", appId: 8 }];
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
    ).toBe(false);
    o.snapshot.checks = [];
    expect(
      (await evaluateGoal(o, goal(["checks-pass"], { checks: "all" }), signal))
        .satisfied,
    ).toBeNull();
  });
  test("app-bound commit statuses with unavailable identity return unknown and wake the waiter", async () => {
    const o = observation();
    const { appId: _appId, ...status } = { ...check, id: "status:build" };
    o.snapshot.checks = [status];
    for (const condition of ["checks-pass", "checks-finished"] as const) {
      const evaluation = await evaluateGoal(o, goal([condition]), signal);
      expect(evaluation.satisfied).toBeNull();
      expect(evaluation.conditions[0]).toMatchObject({
        status: "unknown",
        evidenceIds: ["status:build"],
      });
      expect(evaluation.conditions[0].reason).toContain("app identity");
      expect(
        await runner([o], { goal: goal([condition]) }).run(),
      ).toMatchObject({
        kind: "attention_required",
        satisfied: null,
        observations: 1,
      });
    }
    o.requiredChecks = [{ name: "build", appId: null }];
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
    ).toBe(true);
  });
  test("same-name status uncertainty survives a matching run but does not mask selected failures", async () => {
    const o = observation();
    const { appId: _appId, ...status } = {
      ...check,
      id: "status:build",
      state: "failed" as const,
      conclusion: "failure",
    };
    o.snapshot.checks = [check];
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
    ).toBe(true);
    for (const conclusion of ["failure", "success"]) {
      o.snapshot.checks = [
        {
          ...status,
          conclusion,
          state: conclusion === "success" ? "passed" : "failed",
        },
        check,
      ];
      expect(
        (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
      ).toBeNull();
      expect(await runner([o]).run()).toMatchObject({
        kind: "attention_required",
        satisfied: null,
      });
    }
    o.snapshot.checks = [{ ...check, appId: 8 }];
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
    ).toBe(false);
    o.snapshot.checks = [
      status,
      {
        ...check,
        id: "test",
        name: "test",
        state: "failed",
        conclusion: "failure",
      },
    ];
    o.requiredChecks!.push({ name: "test", appId: 7 });
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).conditions[0],
    ).toMatchObject({
      status: "not_met",
      attention: true,
      evidenceIds: ["test"],
    });
  });
  test("all and named scopes evaluate same-name runs and statuses without required app policy", async () => {
    const o = observation();
    const { appId: _appId, ...status } = { ...check, id: "status:build" };
    o.snapshot.checks = [check, status];
    for (const checks of ["all", ["build"]] as const) {
      const selection = checks === "all" ? checks : [...checks];
      for (const condition of ["checks-pass", "checks-finished"] as const)
        expect(
          (
            await evaluateGoal(
              o,
              goal([condition], { checks: selection }),
              signal,
            )
          ).satisfied,
        ).toBe(true);
      o.snapshot.checks = [
        check,
        { ...status, state: "failed", conclusion: "failure" },
      ];
      expect(
        (
          await evaluateGoal(
            o,
            goal(["checks-pass"], { checks: selection }),
            signal,
          )
        ).satisfied,
      ).toBe(false);
      o.snapshot.checks = [check, status];
    }
    expect(
      (await evaluateGoal(o, goal(["checks-pass"]), signal)).satisfied,
    ).toBeNull();
  });
  test("finished differs from passed, including skipped and neutral outcomes", async () => {
    for (const conclusion of ["failure", "skipped", "neutral"]) {
      const o = observation();
      o.snapshot.checks = [
        {
          ...check,
          conclusion,
          state: conclusion === "failure" ? "failed" : "passed",
        },
      ];
      expect(
        (await evaluateGoal(o, goal(["checks-finished"]), signal)).satisfied,
      ).toBe(true);
      const r = await evaluateGoal(o, goal(["checks-pass"]), signal);
      expect(r.satisfied).toBe(false);
      expect(r.conditions[0].attention).toBe(true);
    }
  });
  test("named checks ignore unrelated failures but pending selected checks remain unmet", async () => {
    const o = observation();
    o.snapshot.checks.push({
      ...check,
      name: "optional",
      id: "optional",
      state: "failed",
      conclusion: "failure",
    });
    expect(
      (
        await evaluateGoal(
          o,
          goal(["checks-pass"], { checks: ["build"] }),
          signal,
        )
      ).satisfied,
    ).toBe(true);
    o.snapshot.checks[0] = { ...check, state: "pending", conclusion: null };
    expect(
      (await evaluateGoal(o, goal(["checks-finished"]), signal)).satisfied,
    ).toBe(false);
  });
  test("formal changes requested completes review but does not approve", async () => {
    const o = observation();
    o.snapshot.feedback = [{ ...review, reviewState: "CHANGES_REQUESTED" }];
    expect(
      (await evaluateGoal(o, goal(["review-finished"]), signal)).satisfied,
    ).toBe(true);
    expect(
      (await evaluateGoal(o, goal(["review-approved"]), signal)).satisfied,
    ).toBe(false);
  });
  test("newer walkthrough comments do not mask any submitted review outcome", async () => {
    for (const state of ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"]) {
      const o = observation();
      o.snapshot.feedback = [
        { ...review, reviewState: state },
        {
          ...review,
          id: "comment:2",
          kind: "comment",
          commitSha: null,
          reviewState: null,
          updatedAt: "2026-09-19T12:00:01Z",
        },
      ];
      expect(
        (await evaluateGoal(o, goal(["review-finished"]), signal)).satisfied,
      ).toBe(true);
      expect(
        (await evaluateGoal(o, goal(["review-approved"]), signal)).satisfied,
      ).toBe(state === "APPROVED");
    }
  });
  test("stale, dismissed, pending and unsubmitted reviews cannot establish completion or approval", async () => {
    for (const override of [
      { commitSha: "b".repeat(40) },
      { reviewState: "DISMISSED" },
      { reviewState: "PENDING" },
      { kind: "comment" as const, commitSha: null, reviewState: null },
    ]) {
      const o = observation();
      o.snapshot.feedback = [{ ...review, ...override }];
      for (const condition of ["review-finished", "review-approved"] as const)
        expect(
          (await evaluateGoal(o, goal([condition]), signal)).satisfied,
        ).toBe(false);
    }
    const o = observation();
    o.reviewSubmittedAt = {};
    expect(
      (await evaluateGoal(o, goal(["review-finished"]), signal)).satisfied,
    ).toBe(false);
  });
  test("approval follows the latest decision by submission time, ignoring comments and pending drafts", async () => {
    for (const laterState of [
      "APPROVED",
      "CHANGES_REQUESTED",
      "COMMENTED",
      "PENDING",
      "DISMISSED",
    ]) {
      const o = observation();
      o.snapshot.feedback = [
        { ...review, updatedAt: "2026-09-19T13:00:00Z" },
        {
          ...review,
          id: "review:2",
          reviewState: laterState,
          updatedAt: "2026-09-19T12:00:01Z",
        },
      ];
      o.reviewSubmittedAt["review:2"] = "2026-09-19T12:00:01Z";
      expect(
        (await evaluateGoal(o, goal(["review-approved"]), signal)).satisfied,
      ).toBe(["APPROVED", "COMMENTED", "PENDING"].includes(laterState));
      expect(
        (await evaluateGoal(o, goal(["review-finished"]), signal)).satisfied,
      ).toBe(laterState !== "DISMISSED");
    }
    const o = observation();
    o.snapshot.feedback = [
      { ...review, reviewState: "DISMISSED" },
      { ...review, id: "review:2" },
    ];
    o.reviewSubmittedAt["review:2"] = "2026-09-19T12:00:01Z";
    expect(
      (await evaluateGoal(o, goal(["review-approved"]), signal)).satisfied,
    ).toBe(true);
  });
  test("review IDs break same-second submission ties numerically", async () => {
    const o = observation();
    o.snapshot.feedback = [
      { ...review, id: "review:9" },
      { ...review, id: "review:10", reviewState: "CHANGES_REQUESTED" },
    ];
    o.reviewSubmittedAt = {
      "review:9": review.updatedAt,
      "review:10": review.updatedAt,
    };
    expect(
      (await evaluateGoal(o, goal(["review-approved"]), signal)).satisfied,
    ).toBe(false);
  });
  test("review evidence respects reviewer, head and submission baseline rather than edits", async () => {
    const o = observation();
    o.snapshot.feedback[0] = { ...review, updatedAt: "2026-09-19T13:00:00Z" };
    for (const overrides of [
      { reviewer: "someone-else" },
      { since: review.updatedAt },
      { head: "b".repeat(40) },
    ]) {
      expect(
        (await evaluateGoal(o, goal(["review-finished"], overrides), signal))
          .satisfied,
      ).toBe(false);
    }
  });
  test("unresolved outdated threads count unless explicitly excluded", async () => {
    const o = observation();
    o.snapshot.threads = [
      {
        id: "t",
        resolved: false,
        outdated: true,
        path: "a",
        line: 1,
        url: null,
      },
    ];
    expect(
      (await evaluateGoal(o, goal(["threads-resolved"]), signal)).satisfied,
    ).toBe(false);
    expect(
      (
        await evaluateGoal(
          o,
          goal(["threads-resolved"], { ignoreOutdated: true }),
          signal,
        )
      ).satisfied,
    ).toBe(true);
  });
  test("feedback uses strict timestamps and author filters, not absence of threads", async () => {
    const o = observation();
    expect(
      (
        await evaluateGoal(
          o,
          goal(["feedback-received"], { since: review.updatedAt }),
          signal,
        )
      ).satisfied,
    ).toBe(false);
    expect(
      (
        await evaluateGoal(
          o,
          goal(["feedback-received"], { since: "2026-09-19T11:59:59Z" }),
          signal,
        )
      ).satisfied,
    ).toBe(true);
    expect(
      (
        await evaluateGoal(
          o,
          goal(["feedback-received"], {
            since: "2026-09-19T11:59:59Z",
            reviewer: "other",
          }),
          signal,
        )
      ).satisfied,
    ).toBe(false);
  });
});

function runner(
  sequence: GoalObservation[],
  overrides: Partial<Parameters<typeof monitorGoal>[0]> = {},
) {
  let time = 0,
    calls = 0;
  return {
    calls: () => calls,
    run: () =>
      monitorGoal({
        mode: "wait",
        goal: goal(["checks-pass"]),
        observe: async () => sequence[Math.min(calls++, sequence.length - 1)],
        timeoutMs: 100,
        intervalMs: 10,
        now: () => time,
        sleep: async (ms) => {
          time += ms;
        },
        ...overrides,
      }),
  };
}
describe("goal waiting", () => {
  test("evaluate observes once without confirmation or sleeping", async () => {
    const r = runner([observation()], {
      mode: "evaluate",
      sleep: async () => {
        throw new Error("must not sleep");
      },
    });
    expect(await r.run()).toMatchObject({
      kind: "evaluation",
      satisfied: true,
      observations: 1,
    });
  });
  test("wait handles an initial pending state and confirms all conditions before returning", async () => {
    const pending = observation();
    pending.snapshot.checks = [
      { ...check, state: "pending", conclusion: null },
    ];
    const r = runner([pending, observation(), observation()]);
    expect(await r.run()).toMatchObject({
      kind: "goal_reached",
      observations: 3,
      satisfied: true,
    });
  });
  test("head changes during final confirmation invalidate success", async () => {
    const moved = observation();
    moved.snapshot.headSha = "b".repeat(40);
    expect(await runner([observation(), moved]).run()).toMatchObject({
      kind: "head_changed",
      satisfied: null,
    });
  });
  test("a failing confirmation returns attention instead of the earlier success", async () => {
    const failed = observation();
    failed.snapshot.checks = [
      { ...check, state: "failed", conclusion: "failure" },
    ];
    expect(await runner([observation(), failed]).run()).toMatchObject({
      kind: "attention_required",
      satisfied: false,
    });
  });
  test("unknown returns control and cannot silently succeed", async () => {
    const o = observation();
    o.requiredChecks = null;
    expect(await runner([o]).run()).toMatchObject({
      kind: "attention_required",
      satisfied: null,
    });
  });
  test("new feedback wakes a pending waiter without interpreting progress text", async () => {
    const before = observation();
    before.snapshot.feedback = [];
    before.snapshot.checks = [{ ...check, state: "pending", conclusion: null }];
    const after = structuredClone(before);
    after.snapshot.feedback = [review];
    expect(await runner([before, after]).run()).toMatchObject({
      kind: "attention_required",
      observations: 2,
    });
    const progress = observation();
    progress.snapshot.feedback = [
      { ...review, kind: "comment", commitSha: null, reviewState: null },
    ];
    expect(
      await runner([progress], {
        goal: goal(["review-finished"], { since: "2026-09-19T11:00:00Z" }),
      }).run(),
    ).toMatchObject({ kind: "attention_required", satisfied: false });
  });

  test("feedback arriving during an unmet confirmation returns attention", async () => {
    const pending = observation();
    pending.snapshot.feedback = [];
    pending.snapshot.checks = [
      { ...check, state: "pending", conclusion: null },
    ];
    const passing = observation();
    passing.snapshot.feedback = [];
    const confirmation = structuredClone(pending);
    confirmation.snapshot.feedback = [review];
    for (const sequence of [
      [pending, passing, confirmation],
      [passing, confirmation],
    ])
      expect(await runner(sequence).run()).toMatchObject({
        kind: "attention_required",
        observations: sequence.length,
        satisfied: false,
      });
  });

  test("a caller can abort an in-flight observation", async () => {
    const controller = new AbortController();
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const r = runner([], {
      signal: controller.signal,
      observe: (signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
          entered();
        }),
    });
    const pending = r.run();
    await started;
    controller.abort();
    expect(await pending).toMatchObject({ kind: "stopped", satisfied: null });
  });

  test("timeouts, cancellation and transient errors remain distinct", async () => {
    const pending = observation();
    pending.snapshot.checks = [
      { ...check, state: "pending", conclusion: null },
    ];
    expect(await runner([pending]).run()).toMatchObject({
      kind: "timeout",
      satisfied: null,
    });
    const aborted = new AbortController();
    aborted.abort();
    expect(
      await runner([pending], { signal: aborted.signal }).run(),
    ).toMatchObject({ kind: "stopped", observations: 0 });
    expect(
      await runner([], {
        observe: async () => {
          throw new ObservationError("rate limited", 20);
        },
      }).run(),
    ).toMatchObject({ kind: "error", satisfied: null });
  });
});
