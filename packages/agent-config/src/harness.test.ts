import { expect, test } from "bun:test";
import { extractInstructions } from "./harness";

test("extracts the keyed instructions instead of a duplicate", () => {
  const config = `
other-instructions = '''
authoritative skill body
'''
git-pr-instructions = '''
stale keyed body
'''
`;

  expect(extractInstructions(config, "git-pr-instructions")).toBe(
    "stale keyed body",
  );
  expect(
    extractInstructions(
      "git-pr-instructions = '''\r\nfirst\r\nsecond\r\n'''\r\n",
      "git-pr-instructions",
    ),
  ).toBe("first second");
});

// git-commit-instructions uses """ while git-pr-instructions uses ''', so the
// extractor has to close on whichever delimiter opened the block.
test("extracts blocks using either TOML delimiter", () => {
  const config = `
git-commit-instructions = """
commit body
"""
git-pr-instructions = '''
pr body
'''
`;

  expect(extractInstructions(config, "git-commit-instructions")).toBe(
    "commit body",
  );
  expect(extractInstructions(config, "git-pr-instructions")).toBe("pr body");
});

// The other delimiter has to be at the start of a line to reach the closing
// match at all, which is the only shape that distinguishes closing on the
// opening delimiter from closing on either one.
test("does not close a block on the other delimiter", () => {
  const config = `git-commit-instructions = """
body line
'''
still the same block
"""
`;

  expect(extractInstructions(config, "git-commit-instructions")).toBe(
    "body line ''' still the same block",
  );
});

test("returns null for missing or unterminated instructions", () => {
  expect(
    extractInstructions("other = 'value'\n", "git-pr-instructions"),
  ).toBeNull();
  expect(
    extractInstructions(
      "git-pr-instructions = '''\nunterminated\n",
      "git-pr-instructions",
    ),
  ).toBeNull();
  expect(
    extractInstructions(
      'git-commit-instructions = """\ncommit body\n"""\n',
      "git-pr-instructions",
    ),
  ).toBeNull();
});
