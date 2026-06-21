import { expect, test } from "bun:test";
import { normalizeSourceUrl, sourceIdForUrl } from "./source-url";

test("normalizeSourceUrl expands GitHub shorthand", () => {
  expect(normalizeSourceUrl("vercel-labs/agent-skills")).toBe(
    "https://github.com/vercel-labs/agent-skills.git",
  );
});

test("normalizeSourceUrl normalizes GitHub HTTPS and SSH URLs", () => {
  const expected = "https://github.com/vercel-labs/agent-skills.git";

  expect(normalizeSourceUrl("https://github.com/vercel-labs/agent-skills")).toBe(
    expected,
  );
  expect(
    normalizeSourceUrl("git@github.com:vercel-labs/agent-skills.git"),
  ).toBe(expected);
});

test("sourceIdForUrl derives unique source ids", () => {
  expect(
    sourceIdForUrl("https://github.com/vercel-labs/agent-skills.git", new Set()),
  ).toBe("agent-skills");
  expect(
    sourceIdForUrl(
      "https://github.com/vercel-labs/agent-skills.git",
      new Set(["agent-skills"]),
    ),
  ).toBe("vercel-labs-agent-skills");
});
