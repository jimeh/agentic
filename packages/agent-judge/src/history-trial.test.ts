import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bin = new URL("../experiments/history-trial.ts", import.meta.url)
  .pathname;

test("history trial refuses success when interrupted after evaluations or during report writing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "history-trial-test-"));
  try {
    const dataset = join(dir, "dataset.json");
    await writeFile(
      dataset,
      JSON.stringify({
        model: "jev-1.13.0",
        candidates: [{ id: "a", text: "Concrete evidence", source: "fixture" }],
        queries: [
          { id: "q", text: "evidence", relevant: ["a"], split: "held-out" },
        ],
      }),
    );
    const preload = join(dir, "preload.ts");
    await writeFile(
      preload,
      `
      import { mock } from "bun:test";
      import * as fs from "node:fs/promises";
      const originalWrite = fs.writeFile;
      mock.module("node:fs/promises", () => ({ ...fs, writeFile: async (file, ...args) => {
        await originalWrite(file, ...args);
        // Deliver the signal through the actual registered handler at a known I/O boundary.
        const name = String(file).split("/").at(-1);
        if ((process.env.TRIAL_TEST_PHASE === "before" && name === "result.json") ||
            (process.env.TRIAL_TEST_PHASE === "during" && name === "report.json"))
          process.emit("SIGTERM");
      }}));
      globalThis.fetch = async () => Response.json({ model: "jev-1.13.0",
        answers: { relevant: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 20 } });
    `,
    );
    for (const phase of ["none", "before", "during"]) {
      const out = join(dir, phase);
      const child = Bun.spawn(
        [
          process.execPath,
          "--preload",
          preload,
          bin,
          "--dataset",
          dataset,
          "--out",
          out,
          "--run",
        ],
        {
          env: {
            ...process.env,
            TYPESAFE_API_KEY: "fixture-token",
            TRIAL_TEST_PHASE: phase,
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const [exit, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      if (phase === "none") {
        expect(exit).toBe(0);
        expect(JSON.parse(stdout).calls).toBe(1);
      } else {
        expect(exit).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain("Trial stopped.");
        if (phase === "before")
          expect(await Bun.file(join(out, "report.json")).exists()).toBe(false);
        else
          expect(
            JSON.parse(await readFile(join(out, "report.json"), "utf8")).calls,
          ).toBe(1);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
