import { expect, test } from "bun:test";
import { redactSecrets } from "./git";

test("redactSecrets removes credentials from git failure text", () => {
  const message = [
    "git clone https://user:pass@example.com/repo.git",
    "remote: token=ghp_1234567890abcdefghij",
    "fatal: password=hunter2",
  ].join("\n");

  expect(redactSecrets(message)).toBe(
    [
      "git clone https://***@example.com/repo.git",
      "remote: token=***",
      "fatal: password=***",
    ].join("\n"),
  );
});
