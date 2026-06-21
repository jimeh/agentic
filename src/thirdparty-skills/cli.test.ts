import { expect, test } from "bun:test";
import { parseCommand } from "./cli";

test("parseCommand parses update defaults", () => {
  const parsed = parseCommand(["update", "--root", "/tmp/repo"]);

  expect(parsed.root).toBe("/tmp/repo");
  expect(parsed.options.dryRun).toBe(false);
  expect(parsed.options.check).toBe(false);
  expect(parsed.options.filter).toBe(null);
});

test("parseCommand parses check as dry-run check", () => {
  const parsed = parseCommand(["check", "--skill", "example-skill"]);

  expect(parsed.options.dryRun).toBe(true);
  expect(parsed.options.check).toBe(true);
  expect(parsed.options.filter).toEqual(new Set(["example-skill"]));
});
