import { describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import {
  evaluate,
  parseRequest,
  requestHash,
  validateResponse,
  type EvaluationRequest,
} from "./evaluate";

const request: EvaluationRequest = {
  model: "jev-1.13.0",
  state: "A reproduced cancellation defect.",
  questions: {
    relevant: { type: "noul", instructions: "Does this report a defect?" },
    category: {
      type: "choice",
      instructions: "Which category?",
      criteria: { bug: "Defect", other: null },
    },
    strength: {
      type: "score",
      instructions: "How strong is the evidence?",
      criteria: ["Speculation", "Reproduction"],
    },
  },
};
function response() {
  return {
    model: "jev-1.13.0",
    answers: {
      relevant: { type: "noul", noul: 0.9 },
      category: {
        type: "choice",
        choice: "bug",
        probabilities: { bug: 0.9, other: 0.1 },
        confidence: 0.8,
      },
      strength: {
        type: "score",
        score: 0.9,
        probabilities: { "0": 0.1, "1": 0.9 },
        legend: { "0": "Speculation", "1": "Reproduction" },
        confidence: 0.8,
      },
    },
    usage: { input_tokens: 200, output_tokens: 20 },
  };
}
const mockFetch = (
  fn: (input: unknown, init?: RequestInit) => Promise<Response>,
) => fn as typeof fetch;

describe("evaluation boundary", () => {
  test("hashes and validates the sent snapshot despite caller mutation", async () => {
    const mutable = structuredClone(request);
    let release!: (response: Response) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const pending = evaluate(mutable, {
      apiKey: "fixture-token",
      fetch: mockFetch(async (_, init) => {
        expect(JSON.parse(init!.body as string)).toEqual(request);
        return new Promise<Response>((resolve) => {
          release = resolve;
          entered();
        });
      }),
    });
    await started;
    mutable.state = "Changed after sending";
    mutable.questions = {
      other: { type: "noul", instructions: "Different question" },
    };
    release(Response.json(response()));
    const result = await pending;
    expect(result.request_sha256).toBe(requestHash(request));
    expect(result.response).toEqual(response());
  });
  test("sends the exact request once and preserves probabilities and usage", async () => {
    let calls = 0;
    const result = await evaluate(request, {
      apiKey: "fixture-token",
      fetch: mockFetch(async (url, init) => {
        calls++;
        expect(url).toBe("https://api.typesafe.ai/v1/systemone");
        expect(init?.redirect).toBe("error");
        expect(init?.headers).toEqual({
          Authorization: "Bearer fixture-token",
          "Content-Type": "application/json",
        });
        expect(JSON.parse(init?.body as string)).toEqual(request);
        return Response.json(response());
      }),
    });
    expect(calls).toBe(1);
    expect(result.response).toEqual(response());
    expect(result.request_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.elapsed_ms).toBeGreaterThanOrEqual(0);
  });

  test("rejects invalid inputs before spending a request", async () => {
    const bad = [
      "not json",
      "null",
      JSON.stringify({ ...request, model: "" }),
      JSON.stringify({ ...request, state: null }),
      JSON.stringify({ ...request, questions: {} }),
      JSON.stringify({ ...request, apiKey: "oops" }),
      JSON.stringify({
        ...request,
        questions: {
          q: { type: "score", instructions: "x", criteria: ["one"] },
        },
      }),
      JSON.stringify({ ...request, state: "x".repeat(128 * 1024) }),
    ];
    for (const text of bad) expect(() => parseRequest(text)).toThrow();
    let calls = 0;
    await rejects(
      evaluate(request, {
        apiKey: "",
        fetch: mockFetch(async () => {
          calls++;
          return Response.json(response());
        }),
      }),
      /TYPESAFE_API_KEY/,
    );
    expect(calls).toBe(0);
  });

  test("keeps structured instructions and criteria supported by the API", () => {
    const input: EvaluationRequest = {
      ...request,
      questions: {
        q: {
          type: "choice",
          instructions: { question: "Pick", exclusions: ["none"] },
          criteria: { a: { description: "A" }, b: null },
        },
      },
    };
    expect(parseRequest(JSON.stringify(input))).toEqual(input);
  });

  test("rejects missing answers, out-of-schema values, invalid probabilities and usage", () => {
    for (const change of [
      (r: any) => {
        delete r.answers.relevant;
      },
      (r: any) => {
        r.answers.relevant.noul = 2;
      },
      (r: any) => {
        r.answers.category.choice = "invented";
      },
      (r: any) => {
        r.answers.category.probabilities = { bug: 0.2, other: 0.2 };
      },
      (r: any) => {
        r.answers.strength.score = 2;
      },
      (r: any) => {
        r.usage.input_tokens = -1;
      },
    ]) {
      const r = response();
      change(r);
      expect(() => validateResponse(r, request)).toThrow(
        "invalid or incomplete",
      );
    }
  });

  test("HTTP failures do not retry or expose the response body", async () => {
    for (const status of [401, 422, 429, 529]) {
      let calls = 0;
      await rejects(
        evaluate(request, {
          apiKey: "fixture-token",
          fetch: mockFetch(async () => {
            calls++;
            return new Response("fixture-token private state", { status });
          }),
        }),
        new RegExp(`HTTP ${status}; no retry`),
      );
      expect(calls).toBe(1);
    }
  });

  test("network errors are sanitized and malformed success bodies fail closed", async () => {
    await rejects(
      evaluate(request, {
        apiKey: "fixture-token",
        fetch: mockFetch(async () => {
          throw new Error("fixture-token");
        }),
      }),
      /TypeSafe request failed/,
    );
    await rejects(
      evaluate(request, {
        apiKey: "fixture-token",
        fetch: mockFetch(async () => new Response("not JSON")),
      }),
      /invalid JSON/,
    );
  });

  test("caller cancellation aborts an in-flight request", async () => {
    const controller = new AbortController();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const pending = evaluate(request, {
      apiKey: "fixture-token",
      signal: controller.signal,
      fetch: mockFetch(async (_, init) => {
        return new Promise<Response>((_, reject) => {
          init!.signal!.addEventListener(
            "abort",
            () => reject(init!.signal!.reason),
            { once: true },
          );
          started();
        });
      }),
    });
    await ready;
    controller.abort();
    await rejects(pending, /interrupted/);
  });
});
