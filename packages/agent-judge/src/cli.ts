import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  evaluate,
  JudgeError,
  maxRequestBytes,
  parseRequest,
} from "./evaluate";

const help = `Usage: agent-judge evaluate --request FILE|- [options]

Send one JSON request to TypeSafe. Use - to read stdin.
Request: {model, state, questions}; model must be explicit.

  --timeout SECONDS     Network deadline, 1..300 (default: 30)
  --artifact-dir PATH   Create a NEW private directory with request/result JSON
  --help, -h            Show help without reading input or calling the API

Auth: TYPESAFE_API_KEY. Endpoint: https://api.typesafe.ai/v1/systemone
One request, no retries. Input limit: 128 KiB (not a token or spending limit).
Output: one JSON evaluation including model, answers, usage and elapsed_ms.
Errors: JSON on stderr; exit 1 error, 2 timeout, 130 SIGINT, 143 SIGTERM.
Artifacts contain submitted state; do not put them in a tracked directory.
Judgments are advisory and do not authorize actions.`;

export async function writePrivateJson(
  file: string,
  value: unknown,
): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  });
}

export async function main(args: string[]): Promise<number> {
  let artifactDir: string | undefined;
  const controller = new AbortController();
  let signalExit = 130;
  const onInt = () => {
    controller.abort();
  };
  const onTerm = () => {
    signalExit = 143;
    controller.abort();
  };
  process.on("SIGINT", onInt);
  process.on("SIGTERM", onTerm);
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        request: { type: "string" },
        timeout: { type: "string" },
        "artifact-dir": { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
    if (values.help) {
      console.log(help);
      return 0;
    }
    if (
      positionals.length !== 1 ||
      positionals[0] !== "evaluate" ||
      !values.request
    )
      throw new JudgeError(
        "input",
        "Use agent-judge evaluate --request FILE|-; see --help.",
      );
    const seconds = Number(values.timeout ?? 30);
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300)
      throw new JudgeError(
        "input",
        "Timeout must be whole seconds between 1 and 300.",
      );
    const stream =
      values.request === "-" ? process.stdin : createReadStream(values.request);
    const stopInput = () =>
      stream.destroy(new JudgeError("stopped", "Input interrupted."));
    controller.signal.addEventListener("abort", stopInput, { once: true });
    let bytes = 0;
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of stream) {
        const buffer = Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > maxRequestBytes)
          throw new JudgeError(
            "input",
            "Request exceeds 128 KiB; select a smaller excerpt.",
          );
        chunks.push(buffer);
      }
    } finally {
      controller.signal.removeEventListener("abort", stopInput);
    }
    const request = parseRequest(Buffer.concat(chunks).toString("utf8"));
    const apiKey = process.env.TYPESAFE_API_KEY ?? "";
    if (!apiKey.trim())
      throw new JudgeError("auth", "Set TYPESAFE_API_KEY before evaluating.");
    if (values["artifact-dir"]) {
      const directory = resolve(values["artifact-dir"]);
      await mkdir(directory, { mode: 0o700 });
      artifactDir = directory;
      await writePrivateJson(join(directory, "request.json"), request);
    }
    const result = await evaluate(request, {
      apiKey,
      timeoutMs: seconds * 1000,
      signal: controller.signal,
    });
    if (artifactDir)
      await writePrivateJson(join(artifactDir, "result.json"), result);
    console.log(JSON.stringify(result));
    return 0;
  } catch (error) {
    const failure =
      error instanceof JudgeError
        ? error
        : new JudgeError(
            "local",
            "Could not read input, parse arguments, or write artifacts; check paths and --help.",
          );
    const result = {
      kind: "error",
      code: failure.code,
      message: failure.message,
      status: failure.status,
    };
    if (artifactDir) {
      try {
        await writePrivateJson(join(artifactDir, "error.json"), result);
      } catch {
        /* Preserve the original error even when artifact storage fails. */
      }
    }
    console.error(JSON.stringify(result));
    return controller.signal.aborted
      ? signalExit
      : failure.code === "timeout"
        ? 2
        : 1;
  } finally {
    process.off("SIGINT", onInt);
    process.off("SIGTERM", onTerm);
  }
}
