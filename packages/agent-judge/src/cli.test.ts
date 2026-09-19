import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bin = new URL("../bin/agent-judge.ts", import.meta.url).pathname;
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

const request = {
  model: "jev-1.13.0",
  state: "Selected excerpt",
  questions: { q: { type: "noul", instructions: "Relevant?" } },
};
async function fixture(mode = "ok") {
  const dir = await mkdtemp(join(tmpdir(), "judge-test-"));
  const preload = join(dir, "preload.ts");
  await writeFile(
    preload,
    `globalThis.fetch = async (url, init) => {
    if (url !== 'https://api.typesafe.ai/v1/systemone') throw Error('unexpected host');
    if (['timeout', 'stop'].includes(process.env.JUDGE_TEST_MODE)) {
      // The real timeout is the behavior under test; wait on the abort event.
      return new Promise((resolve, reject) => {
        const keepAlive = setInterval(() => {}, 1000); // Stand in for an active socket.
        init.signal.addEventListener('abort', () => { clearInterval(keepAlive); reject(init.signal.reason); }, {once:true});
        if (process.env.JUDGE_TEST_MODE === 'stop') console.error('REQUEST_STARTED');
      });
    }
    return Response.json({model:'jev-1.13.0', answers:{q:{type:'noul',noul:0.8}}, usage:{input_tokens:42,output_tokens:3}});
  };`,
  );
  const processes: ReturnType<typeof Bun.spawn>[] = [];
  cleanups.push(async () => {
    for (const child of processes) {
      if (child.exitCode === null) child.kill();
      await child.exited;
    }
    await rm(dir, { recursive: true, force: true });
  });
  const launch = (args: string[], input?: string) => {
    const child = Bun.spawn(
      [process.execPath, "--preload", preload, bin, ...args],
      {
        env: {
          ...process.env,
          TYPESAFE_API_KEY: "fixture-token",
          JUDGE_TEST_MODE: mode,
        },
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    void child.stdin.write(input ?? "");
    void child.stdin.end();
    processes.push(child);
    return child;
  };
  return { dir, launch };
}

test("CLI accepts stdin and records private replay artifacts without credentials", async () => {
  const { dir, launch } = await fixture();
  const artifacts = join(dir, "run");
  const child = launch(
    ["evaluate", "--request", "-", "--artifact-dir", artifacts],
    JSON.stringify(request),
  );
  const exit = await child.exited;
  const stderr = await new Response(child.stderr).text();
  expect(stderr).toBe("");
  expect(exit).toBe(0);
  const output = await new Response(child.stdout).text();
  expect(output.trim().split("\n")).toHaveLength(1);
  expect(JSON.parse(output).response.answers.q.noul).toBe(0.8);
  expect(
    JSON.parse(await readFile(join(artifacts, "request.json"), "utf8")),
  ).toEqual(request);
  expect(await readFile(join(artifacts, "result.json"), "utf8")).not.toContain(
    "fixture-token",
  );
  expect((await stat(artifacts)).mode & 0o777).toBe(0o700);
  expect((await stat(join(artifacts, "request.json"))).mode & 0o777).toBe(
    0o600,
  );
  const repeat = launch(
    ["evaluate", "--request", "-", "--artifact-dir", artifacts],
    JSON.stringify(request),
  );
  expect(await repeat.exited).toBe(1);
});

test("CLI reads a file, prints help without input, and rejects malformed requests", async () => {
  const { dir, launch } = await fixture();
  const file = join(dir, "input.json");
  await writeFile(file, JSON.stringify(request));
  expect(await launch(["evaluate", "--request", file]).exited).toBe(0);
  const help = launch(["--help"]);
  expect(await help.exited).toBe(0);
  expect(await new Response(help.stdout).text()).toContain("no retries");
  const bad = launch(["evaluate", "--request", "-"], "bad");
  expect(await bad.exited).toBe(1);
  expect(await new Response(bad.stdout).text()).toBe("");
  expect(JSON.parse(await new Response(bad.stderr).text()).code).toBe("input");
});

test("CLI returns timeout exit 2 and a recorded error", async () => {
  const { dir, launch } = await fixture("timeout");
  const artifacts = join(dir, "timeout");
  const child = launch(
    [
      "evaluate",
      "--request",
      "-",
      "--timeout",
      "1",
      "--artifact-dir",
      artifacts,
    ],
    JSON.stringify(request),
  );
  expect(await child.exited).toBe(2);
  expect(JSON.parse(await new Response(child.stderr).text()).code).toBe(
    "timeout",
  );
  expect(
    JSON.parse(await readFile(join(artifacts, "error.json"), "utf8")).code,
  ).toBe("timeout");
});

test("SIGTERM cancels the CLI after a request starts and exits 143", async () => {
  const { launch } = await fixture("stop");
  const child = launch(["evaluate", "--request", "-"], JSON.stringify(request));
  const reader = child.stderr.getReader();
  const decoder = new TextDecoder();
  let stderr = "";
  while (!stderr.includes("REQUEST_STARTED")) {
    const chunk = await reader.read();
    if (chunk.done)
      throw new Error(`CLI exited before request start: ${stderr}`);
    stderr += decoder.decode(chunk.value);
  }
  child.kill("SIGTERM");
  expect(await child.exited).toBe(143);
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    stderr += decoder.decode(chunk.value);
  }
  expect(stderr).toContain('"code":"stopped"');
  expect(await new Response(child.stdout).text()).toBe("");
});
