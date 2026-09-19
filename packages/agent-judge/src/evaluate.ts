import { createHash } from "node:crypto";

export const endpoint = "https://api.typesafe.ai/v1/systemone";
export const maxRequestBytes = 128 * 1024;
const maxResponseBytes = 1024 * 1024;

export type Question = {
  type: "noul" | "choice" | "score";
  instructions: unknown;
  criteria?: unknown;
};
export type EvaluationRequest = {
  model: string;
  state: unknown;
  questions: Record<string, Question>;
};
export type EvaluationResponse = {
  model: string;
  answers: Record<string, Record<string, unknown>>;
  usage: { input_tokens?: number; output_tokens?: number };
};

export class JudgeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stateLike(value: unknown): boolean {
  return (
    typeof value === "string" || (value !== null && typeof value === "object")
  );
}

export function parseRequest(text: string): EvaluationRequest {
  if (Buffer.byteLength(text) > maxRequestBytes)
    throw new JudgeError(
      "input",
      "Request exceeds 128 KiB; select a smaller excerpt.",
    );
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new JudgeError("input", "Request must be valid JSON.");
  }
  if (
    !record(value) ||
    typeof value.model !== "string" ||
    !value.model.trim() ||
    !stateLike(value.state) ||
    !record(value.questions) ||
    !Object.keys(value.questions).length ||
    Object.keys(value).some(
      (key) => !["model", "state", "questions"].includes(key),
    )
  )
    throw new JudgeError(
      "input",
      "Expected model, state, and a nonempty questions map only.",
    );
  for (const q of Object.values(value.questions)) {
    if (
      !record(q) ||
      !stateLike(q.instructions) ||
      !["noul", "choice", "score"].includes(String(q.type))
    )
      throw new JudgeError(
        "input",
        "Each question needs a supported type and instructions.",
      );
    if (
      q.type === "choice" &&
      (!record(q.criteria) || Object.keys(q.criteria).length < 2)
    )
      throw new JudgeError(
        "input",
        "Choice requires at least two named criteria.",
      );
    if (
      q.type === "score" &&
      (!Array.isArray(q.criteria) || q.criteria.length < 2)
    )
      throw new JudgeError(
        "input",
        "Score requires at least two ordered criteria.",
      );
    if (q.type === "noul" && q.criteria !== undefined && !record(q.criteria))
      throw new JudgeError(
        "input",
        "Noul criteria must be an object when supplied.",
      );
  }
  return value as EvaluationRequest;
}

function probability(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function sameKeys(
  actual: Record<string, unknown>,
  expected: string[],
): boolean {
  return (
    Object.keys(actual).length === expected.length &&
    expected.every((key) => Object.hasOwn(actual, key))
  );
}

export function validateResponse(
  value: unknown,
  request: EvaluationRequest,
): EvaluationResponse {
  const invalid = () =>
    new JudgeError(
      "response",
      "TypeSafe returned an invalid or incomplete evaluation.",
    );
  if (
    !record(value) ||
    typeof value.model !== "string" ||
    !value.model ||
    !record(value.answers) ||
    !sameKeys(value.answers, Object.keys(request.questions)) ||
    !record(value.usage)
  )
    throw invalid();
  for (const key of ["input_tokens", "output_tokens"]) {
    const count = value.usage[key];
    if (
      count !== undefined &&
      (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)
    )
      throw invalid();
  }
  for (const [id, q] of Object.entries(request.questions)) {
    const a = value.answers[id];
    if (!record(a) || a.type !== q.type) throw invalid();
    if (q.type === "noul") {
      if (!probability(a.noul)) throw invalid();
      continue;
    }
    const keys =
      q.type === "choice"
        ? Object.keys(q.criteria as object)
        : (q.criteria as unknown[]).map((_, i) => String(i));
    if (
      !probability(a.confidence) ||
      !record(a.probabilities) ||
      !sameKeys(a.probabilities, keys) ||
      !Object.values(a.probabilities).every(probability)
    )
      throw invalid();
    const total = Object.values(a.probabilities).reduce<number>(
      (sum, p) => sum + (p as number),
      0,
    );
    if (Math.abs(total - 1) > 0.001) throw invalid();
    if (q.type === "choice") {
      if (typeof a.choice !== "string" || !keys.includes(a.choice))
        throw invalid();
    } else if (
      typeof a.score !== "number" ||
      !Number.isFinite(a.score) ||
      a.score < 0 ||
      a.score > keys.length - 1 ||
      !record(a.legend) ||
      !sameKeys(a.legend, keys)
    )
      throw invalid();
  }
  return value as EvaluationResponse;
}

export function requestHash(request: EvaluationRequest): string {
  return createHash("sha256").update(JSON.stringify(request)).digest("hex");
}

export async function evaluate(
  request: EvaluationRequest,
  options: {
    apiKey: string;
    timeoutMs?: number;
    signal?: AbortSignal;
    fetch?: typeof fetch;
  },
) {
  // Revalidate callers of the library as well as callers of the CLI.
  const normalizedRequest = parseRequest(JSON.stringify(request));
  const body = JSON.stringify(normalizedRequest);
  if (!options.apiKey.trim())
    throw new JudgeError("auth", "Set TYPESAFE_API_KEY before evaluating.");
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000)
    throw new JudgeError(
      "input",
      "Timeout must be between 1 and 300000 milliseconds.",
    );
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout;
  const started = performance.now();
  try {
    const response = await (options.fetch ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body,
      signal,
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new JudgeError(
        "http",
        `TypeSafe returned HTTP ${response.status}; no retry was attempted.`,
        response.status,
      );
    }
    if (!response.body)
      throw new JudgeError("response", "TypeSafe returned an empty body.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      if (bytes > maxResponseBytes)
        throw new JudgeError("response", "TypeSafe response exceeds 1 MiB.");
      chunks.push(chunk);
    }
    let value: unknown;
    try {
      value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new JudgeError("response", "TypeSafe returned invalid JSON.");
    }
    return {
      kind: "evaluation" as const,
      request_sha256: requestHash(normalizedRequest),
      elapsed_ms: Math.round(performance.now() - started),
      response: validateResponse(value, normalizedRequest),
    };
  } catch (error) {
    if (options.signal?.aborted)
      throw new JudgeError(
        "stopped",
        "Evaluation interrupted; remote usage may still be billed.",
      );
    if (timeout.aborted)
      throw new JudgeError(
        "timeout",
        "Evaluation timed out; remote usage may still be billed.",
      );
    if (error instanceof JudgeError) throw error;
    // Transport errors and service bodies can contain headers or submitted state.
    throw new JudgeError(
      "network",
      "TypeSafe request failed; no retry was attempted.",
    );
  }
}
