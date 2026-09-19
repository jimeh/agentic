import { describe, expect, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { createClient, observe } from "./github";
import type { Target } from "./model";
import {
  fixtureState,
  respond,
  type FixtureState,
  type Variables,
} from "./testing";

const target: Target = {
  host: "github.com",
  owner: "owner",
  repo: "repo",
  number: 1,
};
const sha = "a".repeat(40);

type FixtureOptions = Partial<FixtureState> & {
  errorStatus?: number;
  retryAfter?: string;
  errors?: { type?: string; message: string }[];
  changeHead?: boolean;
  stall?: boolean;
};

function clientFixture(options: FixtureOptions = {}) {
  const state = fixtureState({ detail: true, ...options });
  const requests: { method: string; url: URL; variables: Variables }[] = [];
  const fetchImpl = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const body = JSON.parse(
      typeof init?.body === "string" ? init.body : "{}",
    ) as { query?: string; variables: Variables };
    requests.push({
      method: init?.method ?? "GET",
      url,
      variables: body.variables,
    });
    if (!body.query?.trimStart().startsWith("query "))
      throw new Error("Unexpected non-query request");
    if (options.stall)
      return new Promise<Response>((_, reject) => {
        // Like real fetch: an already-aborted signal rejects immediately.
        if (init?.signal?.aborted) reject(init.signal.reason);
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    if (options.errorStatus)
      return Response.json(
        { message: "SECRET TOKEN must not reach output" },
        {
          status: options.errorStatus,
          headers: options.retryAfter
            ? { "retry-after": options.retryAfter }
            : {},
        },
      );
    if (options.errors)
      return Response.json(
        { data: { repository: null }, errors: options.errors },
        {
          headers: options.retryAfter
            ? { "retry-after": options.retryAfter }
            : {},
        },
      );
    if (options.changeHead && requests.length > 1) state.sha = "b".repeat(40);
    return Response.json(respond(body.variables, state));
  }) as typeof fetch;
  return {
    client: createClient(target, "fake-test-token", fetchImpl),
    requests,
  };
}

describe("GitHub observation", () => {
  test("goal metadata does not change legacy snapshot check or review shapes", async () => {
    const { client } = clientFixture();
    const legacy = await observe(client, target);
    expect(legacy.checks.every((c) => !("appId" in c))).toBe(true);
    expect(legacy.feedback.every((f) => !("submittedAt" in f))).toBe(true);
    const goal = await observe(client, target, { captureGoal: () => {} });
    expect(goal.checks.some((c) => "appId" in c)).toBe(true);
  });
  test("observes the whole PR with one read-only query per page", async () => {
    const { client, requests } = clientFixture({
      pages: { checks: 2, reviews: 2, comments: 2, threads: 2 },
    });
    const result = await observe(client, target);
    expect(result.headSha).toBe(sha);
    expect(result.reviewDecision).toBe("APPROVED");
    expect(result.checks.map((check) => [check.id, check.state])).toEqual([
      ["check:1", "pending"],
      ["check:2", "failed"],
      ["status:external", "passed"],
    ]);
    expect(result.feedback.map((item) => item.id).sort()).toEqual([
      "comment:1",
      "comment:2",
      "inline:11",
      "inline:12",
      "review:1",
      "review:2",
    ]);
    expect(
      result.feedback.find((item) => item.id === "comment:2")?.author,
    ).toBe("deleted");
    expect(result.threads).toHaveLength(2);
    expect(result.threads.filter((thread) => !thread.resolved)).toHaveLength(1);
    expect(result.threads[0].outdated).toBe(true);
    const serialized = JSON.stringify(result);
    for (const body of ["comment body", "review body", "inline body"])
      expect(serialized).not.toContain(body);
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.method === "POST")).toBe(true);
    expect(requests[1].variables).toMatchObject({
      checksAfter: "page-2",
      reviewsAfter: "page-2",
      commentsAfter: "page-2",
      threadsAfter: "page-2",
    });
  });

  test("follow-up pages only carry connections that still have pages", async () => {
    const { client, requests } = clientFixture({ pages: { comments: 3 } });
    const result = await observe(client, target);
    expect(
      result.feedback.filter((item) => item.kind === "comment"),
    ).toHaveLength(3);
    expect(requests).toHaveLength(3);
    expect(requests[0].variables).toMatchObject({
      withChecks: true,
      withReviews: true,
      withComments: true,
      withThreads: true,
    });
    for (const request of requests.slice(1))
      expect(request.variables).toMatchObject({
        withChecks: false,
        withReviews: false,
        withComments: true,
        withThreads: false,
      });
    expect(requests[2].variables.commentsAfter).toBe("page-3");
  });

  test("rejects a head change during collection as retryable", async () => {
    await rejects(
      observe(
        clientFixture({ changeHead: true, pages: { reviews: 2 } }).client,
        target,
      ),
      { message: /head changed during observation/, retryAfterMs: 1000 },
    );
  });

  test("classifies GraphQL errors by type", async () => {
    await rejects(
      observe(
        clientFixture({ errors: [{ type: "FORBIDDEN", message: "no" }] })
          .client,
        target,
      ),
      { message: /rejected the query/, retryAfterMs: null },
    );
    await rejects(
      observe(
        clientFixture({ errors: [{ message: "Something went wrong" }] }).client,
        target,
      ),
      { message: /GraphQL query failed/, retryAfterMs: 1000 },
    );
    await rejects(
      observe(
        clientFixture({
          errors: [{ type: "RATE_LIMITED", message: "slow down" }],
          retryAfter: "2",
        }).client,
        target,
      ),
      { message: /rate limit/, retryAfterMs: 2000 },
    );
  });

  test("sanitizes HTTP errors and distinguishes permission failures from outages", async () => {
    for (const status of [401, 403, 404, 500]) {
      try {
        await observe(clientFixture({ errorStatus: status }).client, target);
        throw new Error("expected rejection");
      } catch (error) {
        expect((error as Error).message).not.toContain("SECRET");
        expect((error as { retryAfterMs: number | null }).retryAfterMs).toBe(
          status === 500 ? 1000 : null,
        );
      }
    }
    await rejects(
      observe(
        clientFixture({ errorStatus: 429, retryAfter: "2" }).client,
        target,
      ),
      { retryAfterMs: 2000 },
    );
  });

  test("times out a stalled request instead of hanging the poll", async () => {
    await rejects(
      observe(clientFixture({ stall: true }).client, target, {
        requestTimeoutMs: 20,
      }),
      { message: /timed out/, retryAfterMs: 1000 },
    );
  });

  test("lets the caller's cancellation through untouched", async () => {
    const controller = new AbortController();
    const pending = observe(clientFixture({ stall: true }).client, target, {
      signal: controller.signal,
    });
    controller.abort();
    await rejects(pending, (error: unknown) => {
      expect(error).not.toHaveProperty("retryAfterMs");
      return true;
    });
  });
});
