import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { ObservationError } from "./github";
import {
  changesBetween,
  checksComplete,
  type Change,
  type Snapshot,
  type Target,
} from "./model";
import { lockState, readState, writeJson, type State } from "./state";

/** Transient failures back off exponentially from the poll interval up to this ceiling. */
const MAX_BACKOFF_MS = 5 * 60_000;

export type Result = {
  version: 1;
  runId: string;
  kind: "snapshot" | "change" | "timeout" | "stopped" | "error";
  target: Target;
  headSha: string | null;
  elapsedMs: number;
  observations: number;
  stateFile: string;
  resultFile: string;
  snapshotFile: string | null;
  changes: (Omit<Change, "ids"> & { ids?: string[]; total?: number })[];
  summary: ReturnType<typeof summarize> | null;
  error?: string;
};

function summarize(snapshot: Snapshot, changes: Change[]) {
  const feedbackIds = new Set(
    changes.flatMap((change) =>
      change.kind === "feedback_changed" ? (change.ids ?? []) : [],
    ),
  );
  const failed = snapshot.checks.filter((check) => check.state === "failed");
  const unresolved = snapshot.threads.filter((thread) => !thread.resolved);
  const feedback = snapshot.feedback.filter((item) => feedbackIds.has(item.id));
  return {
    url: snapshot.url,
    observedAt: snapshot.observedAt,
    state: snapshot.state,
    draft: snapshot.draft,
    reviewDecision: snapshot.reviewDecision,
    mergeStateStatus: snapshot.mergeStateStatus,
    checks: {
      total: snapshot.checks.length,
      complete: checksComplete(snapshot.checks),
      pending: snapshot.checks.filter((check) => check.state === "pending")
        .length,
      failed: failed.length,
      failures: failed.slice(0, 20),
    },
    unresolvedThreads: unresolved.length,
    threads: unresolved.slice(0, 20),
    feedback: feedback.slice(0, 20),
    truncated:
      failed.length > 20 || unresolved.length > 20 || feedback.length > 20,
  };
}

export type MonitorOptions = {
  target: Target;
  stateFile: string;
  mode: "snapshot" | "wait";
  intervalMs: number;
  timeoutMs: number;
  /** Delay before the first observation of a wait; counts toward the timeout. */
  initialDelayMs?: number;
  signal?: AbortSignal;
  observe: (signal: AbortSignal) => Promise<Snapshot>;
  now?: () => number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
};

/** Poll without progress output. The caller prints the one durable final result. */
export async function monitor(options: MonitorOptions): Promise<Result> {
  const release = await lockState(options.stateFile);
  try {
    return await run(options);
  } finally {
    await release();
  }
}

async function run(options: MonitorOptions): Promise<Result> {
  const now = options.now ?? Date.now;
  const pause =
    options.sleep ?? ((ms, signal) => sleep(ms, undefined, { signal }));
  const start = now();
  const deadline = start + options.timeoutMs;
  const timer = AbortSignal.timeout(options.timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timer])
    : timer;
  let state: State | null = await readState(options.stateFile, options.target);
  let current = state?.snapshot ?? null;
  let observations = 0;
  let failures = 0;
  let lastError: string | null = null;
  const runId = randomUUID();
  const runDir = join(dirname(options.stateFile), "runs", runId);
  const resultFile = join(runDir, "result.json");

  const finish = async (
    kind: Result["kind"],
    changes: Change[] = [],
    error?: string,
  ): Promise<Result> => {
    const snapshotFile = current ? join(runDir, "snapshot.json") : null;
    const result: Result = {
      version: 1,
      runId,
      kind,
      target: options.target,
      headSha: current?.headSha ?? null,
      elapsedMs: now() - start,
      observations,
      stateFile: options.stateFile,
      resultFile,
      snapshotFile,
      changes: changes.map((change) =>
        change.ids
          ? {
              kind: change.kind,
              ids: change.ids.slice(0, 20),
              total: change.ids.length,
            }
          : change,
      ),
      summary: current ? summarize(current, changes) : null,
      ...(error ? { error } : {}),
    };
    if (snapshotFile) await writeJson(snapshotFile, current);
    await writeJson(resultFile, {
      ...result,
      changes: changes.map((change) =>
        change.ids ? { ...change, total: change.ids.length } : change,
      ),
    });
    // Persist the result before advancing the cursor, so an interrupted delivery is recoverable.
    if (state)
      await writeJson(options.stateFile, { ...state, lastResult: resultFile });
    return result;
  };

  const rest = async (ms: number): Promise<void> => {
    try {
      await pause(Math.min(ms, Math.max(0, deadline - now())), signal);
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  };

  if (options.mode === "wait" && options.initialDelayMs) {
    await rest(options.initialDelayMs);
  }

  while (now() < deadline && !signal.aborted) {
    let delay = options.intervalMs;
    try {
      const observed = await options.observe(signal);
      if (signal.aborted) break;
      observations++;
      failures = 0;
      lastError = null;
      const previous =
        current && state
          ? { ...current, mergeStateStatus: state.lastKnownMergeState }
          : current;
      const changes = previous ? changesBetween(previous, observed) : [];
      const initial = !current;
      current = observed;
      state = {
        version: 1,
        target: options.target,
        snapshot: observed,
        // Preserve UNKNOWN in evidence without waking again when it returns to a known value.
        lastKnownMergeState:
          observed.mergeStateStatus === "UNKNOWN"
            ? (state?.lastKnownMergeState ?? "UNKNOWN")
            : observed.mergeStateStatus,
        lastResult: state?.lastResult ?? null,
      };
      if (options.mode === "snapshot" || initial)
        return await finish("snapshot");
      if (changes.length) return await finish("change", changes);
      await writeJson(options.stateFile, state);
    } catch (error) {
      if (signal.aborted) break;
      if (!(error instanceof ObservationError)) throw error;
      if (error.retryAfterMs === null)
        return await finish("error", [], error.message);
      // Keep retrying transient failures until the deadline rather than waking the caller early.
      failures++;
      lastError = error.message;
      delay = Math.max(
        error.retryAfterMs,
        Math.min(options.intervalMs * 2 ** (failures - 1), MAX_BACKOFF_MS),
      );
    }
    if (now() >= deadline) break;
    await rest(delay);
  }
  if (options.signal?.aborted) return finish("stopped");
  if (lastError)
    return finish(
      "error",
      [],
      `${lastError}; ${failures} consecutive failure${failures === 1 ? "" : "s"} until the wait deadline`,
    );
  return finish("timeout");
}
