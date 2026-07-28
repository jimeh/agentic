import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { checkAgentHarness, extractInstructions } from "./harness";

let tempDirs: string[] = [];

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "agentic-harness-root-"));
  tempDirs.push(root);
  return root;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writePlugin(root: string, name: string, version: string): void {
  const manifestDir = join(root, "plugins", name, ".claude-plugin");
  mkdirSync(manifestDir, { recursive: true });
  writeJson(join(manifestDir, "plugin.json"), { name, version });
}

function writeMarketplace(
  root: string,
  plugins: Array<{ name: string; version: string; source: string }>,
): void {
  const marketplaceDir = join(root, ".claude-plugin");
  mkdirSync(marketplaceDir, { recursive: true });
  writeJson(join(marketplaceDir, "marketplace.json"), {
    name: "test-marketplace",
    plugins,
  });
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

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

test("allows valid local plugins to remain unpublished", () => {
  const root = createRoot();
  writePlugin(root, "rtk", "1.0.0");
  writePlugin(root, "deprecated-plugin", "2.0.0");
  writeMarketplace(root, [
    {
      name: "rtk",
      version: "1.0.0",
      source: "./plugins/rtk",
    },
  ]);

  expect(checkAgentHarness(["--root", root])).toBe(0);
});

test("rejects a published plugin without a local manifest", () => {
  const root = createRoot();
  writeMarketplace(root, [
    {
      name: "missing-plugin",
      version: "1.0.0",
      source: "./plugins/missing-plugin",
    },
  ]);

  expect(checkAgentHarness(["--root", root])).toBe(1);
});
