import { expect, test } from "bun:test";
import { parseCommand } from "./cli";

test("parseCommand parses update defaults", () => {
  const parsed = parseCommand(["update", "--root", "/tmp/repo"]);

  expect(parsed.command).toBe("update");
  expect(parsed.root).toBe("/tmp/repo");
  if (parsed.command === "update") {
    expect(parsed.options.dryRun).toBe(false);
    expect(parsed.options.check).toBe(false);
    expect(parsed.options.filter).toBe(null);
  }
});

test("parseCommand parses check as dry-run check", () => {
  const parsed = parseCommand(["check", "--skill", "example-skill"]);

  expect(parsed.command).toBe("check");
  if (parsed.command === "check") {
    expect(parsed.options.dryRun).toBe(true);
    expect(parsed.options.check).toBe(true);
    expect(parsed.options.filter).toEqual(new Set(["example-skill"]));
  }
});

test("parseCommand parses add options", () => {
  const parsed = parseCommand([
    "add",
    "vercel-labs/agent-skills",
    "--ref",
    "main",
    "--skill",
    "react-best-practices",
  ]);

  expect(parsed.command).toBe("add");
  if (parsed.command === "add") {
    expect(parsed.options.source).toBe("vercel-labs/agent-skills");
    expect(parsed.options.ref).toBe("main");
    expect(parsed.options.skills).toEqual(["react-best-practices"]);
  }
});
