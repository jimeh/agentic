import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTarget } from "./cli";
import { fixtureState, respond, type Variables } from "./testing";

const bin = new URL("../bin/agent-pr-monitor.ts", import.meta.url).pathname;
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "pr-monitor-cli-"));
  const stateFile = join(directory, "state.json");
  const state = fixtureState();
  let requests = 0;
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      requests++;
      const url = new URL(request.url);
      if (url.pathname !== "/graphql" || request.method !== "POST")
        return new Response("only GraphQL queries are expected", {
          status: 405,
        });
      const body = (await request.json()) as {
        query: string;
        variables: Variables;
      };
      if (!body.query.trimStart().startsWith("query "))
        return new Response("mutation rejected", { status: 405 });
      return Response.json(respond(body.variables, state));
    },
  });
  const preload = join(directory, "preload.ts");
  await writeFile(
    preload,
    `const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const requested = new URL(input instanceof Request ? input.url : input);
  if (requested.hostname !== "api.github.com") throw new Error("Unexpected API host");
  return realFetch(new URL(requested.pathname + requested.search, process.env.MONITOR_TEST_API), init);
};
`,
  );
  const processes: ReturnType<typeof Bun.spawn>[] = [];
  const launch = (mode: string, extra: string[] = []) => {
    const child = Bun.spawn(
      [
        process.execPath,
        "--preload",
        preload,
        bin,
        mode,
        "https://github.com/owner/repo/pull/1",
        "--state-file",
        stateFile,
        ...extra,
      ],
      {
        env: {
          ...process.env,
          GH_TOKEN: "fake-cli-test-token",
          GITHUB_TOKEN: "",
          MONITOR_TEST_API: server.url.toString(),
        },
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    processes.push(child);
    return child;
  };
  cleanups.push(async () => {
    for (const child of processes) {
      if (child.exitCode === null) child.kill();
      await child.exited;
    }
    await server.stop(true);
    await rm(directory, { recursive: true, force: true });
  });
  return {
    launch,
    stateFile,
    requests: () => requests,
    complete: () => {
      state.completed = true;
    },
  };
}

describe("CLI", () => {
  test("validates PR URLs and prevents ambiguous hosts and filesystem traversal", () => {
    expect(
      parseTarget("https://github.com/Owner/Repo/pull/123#discussion"),
    ).toEqual({
      host: "github.com",
      owner: "owner",
      repo: "repo",
      number: 123,
    });
    for (const url of [
      "http://github.com/o/r/pull/1",
      "https://token@github.com/o/r/pull/1",
      "https://github.com:8080/o/r/pull/1",
      "https://github.com/o/r/issues/1",
      "https://github.com/o/r/pull/0",
      "https://github.com/o/../pull/1",
    ]) {
      expect(() => parseTarget(url)).toThrow();
    }
  });

  test("prints help without authentication or API calls", async () => {
    const child = Bun.spawn([process.execPath, bin, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await child.exited).toBe(0);
    expect(await new Response(child.stdout).text()).toContain("snapshot|wait");
  });

  test("rejects an interval below the floor before touching GitHub", async () => {
    const { launch, requests } = await fixture();
    const child = launch("wait", ["--interval", "5"]);
    expect(await child.exited).toBe(1);
    expect(await new Response(child.stderr).text()).toContain("between 15");
    expect(requests()).toBe(0);
  });

  test("the actual CLI stays silent during a wait and prints one result at timeout", async () => {
    const { launch, stateFile, requests } = await fixture();
    const initial = launch("snapshot");
    expect(await initial.exited).toBe(0);
    expect(JSON.parse(await new Response(initial.stdout).text()).kind).toBe(
      "snapshot",
    );
    expect(requests()).toBe(1);
    const child = launch("wait", ["--timeout", "1"]);
    let output = "";
    const consume = (async () => {
      for await (const chunk of child.stdout)
        output += new TextDecoder().decode(chunk);
    })();
    await Bun.sleep(200);
    expect(output).toBe("");
    expect(child.exitCode).toBeNull();
    expect(await child.exited).toBe(2);
    await consume;
    expect(output.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(output).kind).toBe("timeout");
    expect(await new Response(child.stderr).text()).toBe("");
    expect(requests()).toBe(2);
    expect(await readFile(stateFile, "utf8")).not.toContain(
      "fake-cli-test-token",
    );
  });

  test("returns an actionable result on completion, then deduplicates it on restart", async () => {
    const { launch, complete } = await fixture();
    expect(await launch("snapshot").exited).toBe(0);
    complete();
    const child = launch("wait");
    expect(await child.exited).toBe(0);
    const result = JSON.parse(await new Response(child.stdout).text());
    expect(result.kind).toBe("change");
    expect(result.changes).toEqual([{ kind: "checks_completed" }]);
    expect(result.headSha).toBe("a".repeat(40));
    expect(await launch("wait", ["--timeout", "1"]).exited).toBe(2);
  });

  test("an initial delay defers the first poll", async () => {
    const { launch, requests } = await fixture();
    expect(await launch("snapshot").exited).toBe(0);
    const child = launch("wait", ["--initial-delay", "1", "--timeout", "1"]);
    expect(await child.exited).toBe(2);
    const result = JSON.parse(await new Response(child.stdout).text());
    expect(result.kind).toBe("timeout");
    expect(result.observations).toBe(0);
    expect(requests()).toBe(1);
  });

  test("SIGTERM stops the actual process and releases the state lock", async () => {
    const { launch, requests } = await fixture();
    expect(await launch("snapshot").exited).toBe(0);
    const previous = requests();
    const child = launch("wait");
    for (let attempt = 0; attempt < 100 && requests() === previous; attempt++)
      await Bun.sleep(10);
    expect(requests()).toBeGreaterThan(previous);
    child.kill("SIGTERM");
    expect(await child.exited).toBe(143);
    expect(JSON.parse(await new Response(child.stdout).text()).kind).toBe(
      "stopped",
    );
    expect(await launch("snapshot").exited).toBe(0);
  });
});
