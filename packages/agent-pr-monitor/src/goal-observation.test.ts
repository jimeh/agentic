import { expect, test } from "bun:test";
import { createClient } from "./github";
import { observeGoal } from "./goal-observation";
import { fixtureState, respond } from "./testing";
const target = { host: "github.com", owner: "owner", repo: "repo", number: 1 };

function fixture(failRules = false) {
  let ruleCalls = 0;
  const client = createClient(target, "secret", (async (_input, init) => {
    if (init?.method === "POST") {
      const req = JSON.parse(typeof init.body === "string" ? init.body : "");
      const result = respond(req.variables, fixtureState({ detail: true }));
      const reviews = result.data.repository.pullRequest.reviews as
        | { nodes: { submittedAt?: string }[] }
        | undefined;
      for (const review of reviews?.nodes ?? [])
        review.submittedAt = "2026-09-19T12:00:00Z";
      Object.assign(result.data.repository.pullRequest, {
        mergeable: "MERGEABLE",
        baseRefName: "release/next",
        baseRef: {
          branchProtectionRule: {
            requiredStatusChecks: [
              { context: "classic", app: { databaseId: 7 } },
            ],
          },
        },
      });
      return Response.json(result);
    }
    ruleCalls++;
    if (failRules)
      return Response.json({ message: "private details" }, { status: 403 });
    return Response.json(
      [
        {
          type: "required_status_checks",
          parameters: {
            required_status_checks: [
              { context: `ruleset-${ruleCalls}`, integration_id: null },
            ],
          },
        },
      ],
      {
        headers:
          ruleCalls === 1
            ? { link: '<https://api.github.com/next>; rel="next"' }
            : {},
      },
    );
  }) as typeof fetch);
  return { client, ruleCalls: () => ruleCalls };
}

test("required checks include classic protections plus all active ruleset pages", async () => {
  const f = fixture();
  const result = await observeGoal(
    f.client,
    target,
    true,
    new AbortController().signal,
  );
  expect(result.requiredChecks).toEqual([
    { name: "classic", appId: 7 },
    { name: "ruleset-1", appId: null },
    { name: "ruleset-2", appId: null },
  ]);
  expect(result.mergeable).toBe("MERGEABLE");
  expect(result.reviewSubmittedAt["review:1"]).toBe("2026-09-19T12:00:00Z");
  expect(JSON.stringify(result.snapshot)).not.toContain("review body");
  expect(f.ruleCalls()).toBe(2);
});

test("unavailable rules cannot silently fall back to incomplete classic requirements", async () => {
  const f = fixture(true);
  const result = await observeGoal(
    f.client,
    target,
    true,
    new AbortController().signal,
  );
  expect(result.requiredChecks).toBeNull();
  expect(JSON.stringify(result)).not.toContain("private details");
});

test("named checks and non-check goals do not fetch rules", async () => {
  const f = fixture();
  await observeGoal(f.client, target, false, new AbortController().signal);
  expect(f.ruleCalls()).toBe(0);
});
