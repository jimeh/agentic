import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ObservationError } from "./github";
import { monitor, type MonitorOptions } from "./monitor";
import { check, feedback, snapshot } from "./model.test";
import { lockState, readState, writeJson } from "./state";
import type { Snapshot, Target } from "./model";

const target: Target = {
  host: "github.com",
  owner: "owner",
  repo: "repo",
  number: 1,
};
const directories: string[] = [];
afterEach(async () => {
  mock.restore();
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  // The injected clock owns these deadlines. Real timer cancellation is covered
  // by the CLI tests and must not race filesystem writes in this fixture.
  spyOn(AbortSignal, "timeout").mockImplementation(
    () => new AbortController().signal,
  );
  const directory = await mkdtemp(join(tmpdir(), "pr-monitor-"));
  directories.push(directory);
  let time = 0;
  const waits: number[] = [];
  const options = {
    target,
    stateFile: join(directory, "state.json"),
    mode: "wait" as const,
    intervalMs: 10,
    timeoutMs: 100,
    now: () => time,
    sleep: async (ms: number) => {
      waits.push(ms);
      time += ms;
    },
  };
  return { directory, options, waits };
}

function sequence(items: (Snapshot | Error)[]): MonitorOptions["observe"] {
  let index = 0;
  return async () => {
    const item = items[Math.min(index++, items.length - 1)];
    if (item instanceof Error) throw item;
    return item;
  };
}

describe("durable waiting", () => {
  test("establishes a baseline, waits through unchanged polls, and deduplicates on restart", async () => {
    const { options, waits } = await fixture();
    const before = snapshot({ checks: [check("build")] });
    const after = snapshot({ checks: [check("build", "passed")] });
    const initial = await monitor({ ...options, observe: sequence([before]) });
    expect(initial.kind).toBe("snapshot");
    const result = await monitor({
      ...options,
      observe: sequence([before, before, after]),
    });
    expect(result.kind).toBe("change");
    expect(result.changes).toEqual([{ kind: "checks_completed" }]);
    expect(result.observations).toBe(3);
    expect(waits).toEqual([10, 10]);
    expect(JSON.parse(await readFile(result.resultFile, "utf8"))).toEqual(
      result,
    );
    expect((await readState(options.stateFile, target))?.lastResult).toBe(
      result.resultFile,
    );
    const resumed = await monitor({ ...options, observe: sequence([after]) });
    expect(resumed.kind).toBe("timeout");
    expect(resumed.runId).not.toBe(result.runId);
    expect(resumed.resultFile).not.toBe(result.resultFile);
  });

  test("retains successful intermediate jobs without waking", async () => {
    const { options } = await fixture();
    await monitor({
      ...options,
      observe: sequence([snapshot({ checks: [check("a"), check("b")] })]),
    });
    const result = await monitor({
      ...options,
      observe: sequence([
        snapshot({ checks: [check("a", "passed"), check("b")] }),
        snapshot({ checks: [check("a", "passed"), check("b", "passed")] }),
      ]),
    });
    expect(result.observations).toBe(2);
    expect(result.changes).toEqual([{ kind: "checks_completed" }]);
  });

  test("bounds output while retaining the complete observation in its own artifact", async () => {
    const { options } = await fixture();
    await monitor({ ...options, observe: sequence([snapshot()]) });
    const after = snapshot({
      feedback: Array.from({ length: 30 }, (_, index) =>
        feedback(String(index)),
      ),
    });
    const result = await monitor({ ...options, observe: sequence([after]) });
    expect(result.summary?.feedback).toHaveLength(20);
    expect(result.summary?.truncated).toBe(true);
    expect(result.changes[0].total).toBe(30);
    expect(
      JSON.parse(await readFile(result.resultFile, "utf8")).changes[0].ids,
    ).toHaveLength(30);
    expect(
      JSON.parse(await readFile(result.snapshotFile!, "utf8")).feedback,
    ).toHaveLength(30);
  });

  test("transient failures back off until the deadline and never replace the last good snapshot", async () => {
    const { options, waits } = await fixture();
    await monitor({ ...options, observe: sequence([snapshot()]) });
    const result = await monitor({
      ...options,
      timeoutMs: 10_000,
      observe: sequence([new ObservationError("rate limited", 1000)]),
    });
    // Retry-after dominates until exponential backoff from the interval outgrows it.
    expect(waits).toEqual([...Array(7).fill(1000), 1280, 1720]);
    expect(result.kind).toBe("error");
    expect(result.error).toBe(
      "rate limited; 9 consecutive failures until the wait deadline",
    );
    expect(result.observations).toBe(0);
    expect((await readState(options.stateFile, target))?.snapshot.headSha).toBe(
      "a".repeat(40),
    );
  });

  test("recovers from a transient failure without reporting it", async () => {
    const { options, waits } = await fixture();
    await monitor({ ...options, observe: sequence([snapshot()]) });
    const result = await monitor({
      ...options,
      timeoutMs: 10_000,
      observe: sequence([
        new ObservationError("outage", 1000),
        snapshot({ checks: [check("a", "failed")] }),
      ]),
    });
    expect(waits).toEqual([1000]);
    expect(result.kind).toBe("change");
    expect(result.error).toBeUndefined();
  });

  test("does not retry permission errors, and never retries earlier than the rate limit allows", async () => {
    const { options, waits } = await fixture();
    const forbidden = await monitor({
      ...options,
      observe: sequence([new ObservationError("forbidden")]),
    });
    expect(forbidden.kind).toBe("error");
    expect(forbidden.error).toBe("forbidden");
    const limited = await monitor({
      ...options,
      observe: sequence([new ObservationError("rate limited", 1000)]),
    });
    expect(limited.kind).toBe("error");
    expect(limited.error).toContain("1 consecutive failure until");
    expect(waits).toEqual([100]);
  });

  test("supports cancellation during an in-flight request and releases the cursor lock", async () => {
    const { options } = await fixture();
    const controller = new AbortController();
    const result = await monitor({
      ...options,
      signal: controller.signal,
      observe: async (signal) => {
        controller.abort();
        signal.throwIfAborted();
        return snapshot();
      },
    });
    expect(result.kind).toBe("stopped");
    const release = await lockState(options.stateFile);
    await release();
  });

  test("rejects concurrent observers, malformed state, and another PR's cursor", async () => {
    const { options } = await fixture();
    const release = await lockState(options.stateFile);
    try {
      await rejects(
        monitor({ ...options, observe: sequence([snapshot()]) }),
        /locked/,
      );
    } finally {
      await release();
    }
    await writeJson(options.stateFile, { version: 999 });
    await rejects(
      monitor({ ...options, observe: sequence([snapshot()]) }),
      /Invalid or mismatched/,
    );
    await writeJson(options.stateFile, {
      version: 1,
      target: { ...target, number: 2 },
      snapshot: snapshot(),
      lastResult: null,
    });
    await rejects(
      monitor({ ...options, observe: sequence([snapshot()]) }),
      /Invalid or mismatched/,
    );
    expect(
      JSON.parse(await readFile(options.stateFile, "utf8")).target.number,
    ).toBe(2);
  });

  test("does not repeatedly wake on transient UNKNOWN merge state", async () => {
    const { options } = await fixture();
    await monitor({ ...options, observe: sequence([snapshot()]) });
    const result = await monitor({
      ...options,
      observe: sequence([
        snapshot({ mergeStateStatus: "UNKNOWN" }),
        snapshot(),
        snapshot(),
      ]),
    });
    expect(result.kind).toBe("timeout");
  });
});
