import { expect, test } from "bun:test";
import { extractGitPrInstructions } from "./harness";

test("extracts the keyed git PR instructions instead of a duplicate", () => {
  const config = `
other-instructions = '''
authoritative skill body
'''
git-pr-instructions = '''
stale keyed body
'''
`;

  expect(extractGitPrInstructions(config)).toBe("stale keyed body");
  expect(
    extractGitPrInstructions(
      "git-pr-instructions = '''\r\nfirst\r\nsecond\r\n'''\r\n",
    ),
  ).toBe("first second");
});

test("returns null for missing or unterminated git PR instructions", () => {
  expect(extractGitPrInstructions("other = 'value'\n")).toBeNull();
  expect(
    extractGitPrInstructions("git-pr-instructions = '''\nunterminated\n"),
  ).toBeNull();
});
