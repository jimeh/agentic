import { setTimeout as sleep } from "node:timers/promises";
import { ObservationError } from "./github";
import {
  evaluateGoal,
  validateGoal,
  type Evaluation,
  type Goal,
  type GoalObservation,
} from "./goals";

export type GoalMonitorOptions = {
  mode: "evaluate" | "wait";
  goal: Goal;
  observe: (signal: AbortSignal) => Promise<GoalObservation>;
  timeoutMs: number;
  intervalMs: number;
  initialDelayMs?: number;
  signal?: AbortSignal;
  now?: () => number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
};

/** Goal probes do not read, lock, or advance the legacy change cursor. */
export async function monitorGoal(options: GoalMonitorOptions) {
  validateGoal(options.goal);
  const now = options.now ?? Date.now;
  const pause =
    options.sleep ??
    ((ms: number, signal: AbortSignal) => sleep(ms, undefined, { signal }));
  const start = now(),
    deadline = start + options.timeoutMs;
  const signal = AbortSignal.any([
    AbortSignal.timeout(options.timeoutMs),
    ...(options.signal ? [options.signal] : []),
  ]);
  let observation: GoalObservation | undefined;
  let evaluation: Evaluation | undefined;
  let head = options.goal.head?.toLowerCase();
  let observations = 0,
    failures = 0;
  let lastError: string | undefined;
  let previousFeedback: Map<string, string> | undefined;
  const finish = (
    kind:
      | "evaluation"
      | "goal_reached"
      | "attention_required"
      | "head_changed"
      | "timeout"
      | "stopped"
      | "error",
    error?: string,
  ) => ({
    version: 1,
    kind,
    url: observation?.snapshot.url ?? null,
    headSha: observation?.snapshot.headSha ?? null,
    observedAt: observation?.snapshot.observedAt ?? null,
    elapsedMs: now() - start,
    observations,
    goal: { ...options.goal, head },
    satisfied: ["head_changed", "timeout", "stopped", "error"].includes(kind)
      ? null
      : (evaluation?.satisfied ?? null),
    status: ["head_changed", "timeout", "stopped", "error"].includes(kind)
      ? "unknown"
      : (evaluation?.status ?? "unknown"),
    conditions: evaluation?.conditions ?? [],
    ...(error ? { error } : {}),
  });
  const rest = async (ms: number) => {
    try {
      await pause(Math.min(ms, Math.max(0, deadline - now())), signal);
    } catch {
      if (!signal.aborted) throw new Error("Wait interrupted");
    }
  };
  if (options.mode === "wait" && options.initialDelayMs)
    await rest(options.initialDelayMs);
  while (now() < deadline && !signal.aborted) {
    let delay = options.intervalMs;
    try {
      observation = await options.observe(signal);
      if (signal.aborted) break;
      observations++;
      head ??= observation.snapshot.headSha;
      if (head.toLowerCase() !== observation.snapshot.headSha.toLowerCase())
        return finish("head_changed");
      let changedFeedback = observation.snapshot.feedback.some((f) =>
        previousFeedback
          ? previousFeedback.get(f.id) !== JSON.stringify(f)
          : Boolean(
              options.goal.since &&
              Date.parse(f.updatedAt) > Date.parse(options.goal.since),
            ),
      );
      evaluation = await evaluateGoal(
        observation,
        { ...options.goal, head },
        signal,
      );
      if (signal.aborted) break;
      failures = 0;
      lastError = undefined;
      if (options.mode === "evaluate") return finish("evaluation");
      if (evaluation.satisfied) {
        // Re-observe every condition, not just the SHA: checks and reviews can change between observations.
        const beforeConfirmation = new Map(
          observation.snapshot.feedback.map((f) => [f.id, JSON.stringify(f)]),
        );
        observation = await options.observe(signal);
        changedFeedback ||= observation.snapshot.feedback.some(
          (f) => beforeConfirmation.get(f.id) !== JSON.stringify(f),
        );
        if (signal.aborted) break;
        observations++;
        if (head !== observation.snapshot.headSha)
          return finish("head_changed");
        evaluation = await evaluateGoal(
          observation,
          { ...options.goal, head },
          signal,
        );
        if (signal.aborted) break;
        if (evaluation.satisfied) return finish("goal_reached");
      }
      if (
        evaluation.conditions.some((c) => c.attention || c.status === "unknown")
      )
        return finish("attention_required");
      if (observation.snapshot.state !== "open")
        return finish("attention_required");
      if (changedFeedback) return finish("attention_required");
      previousFeedback = new Map(
        observation.snapshot.feedback.map((f) => [f.id, JSON.stringify(f)]),
      );
    } catch (error) {
      if (signal.aborted) break;
      if (!(error instanceof ObservationError))
        return finish("error", "Could not evaluate PR conditions");
      lastError = error.message;
      if (options.mode === "evaluate" || error.retryAfterMs === null)
        return finish("error", lastError);
      failures++;
      delay = Math.max(
        error.retryAfterMs,
        Math.min(options.intervalMs * 2 ** (failures - 1), 300_000),
      );
    }
    await rest(delay);
  }
  return finish(
    options.signal?.aborted ? "stopped" : lastError ? "error" : "timeout",
    lastError,
  );
}
