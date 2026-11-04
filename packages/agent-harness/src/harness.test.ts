import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, spyOn, test } from "bun:test";
import { checkAgentHarness } from "./harness";

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

function writeVendoredSkill(
  root: string,
  files: { skill: string; openai?: string },
): void {
  const skillDir = join(root, "thirdparty", "skills", "example-skill");
  mkdirSync(join(skillDir, "agents"), { recursive: true });
  writeJson(join(root, "thirdparty", "skills.manifest.json"), {
    version: 1,
    sources: [
      {
        id: "test-source",
        type: "git",
        url: "https://example.com/skills.git",
        ref: "main",
        skills: [
          {
            name: "example-skill",
            path: "skills/example-skill",
            overrides: { explicitOnly: true },
          },
        ],
      },
    ],
  });
  writeJson(join(root, "thirdparty", "skills.lock.json"), {
    version: 1,
    skills: {},
  });
  writeFileSync(join(skillDir, "SKILL.md"), files.skill);
  if (files.openai !== undefined) {
    writeFileSync(join(skillDir, "agents", "openai.yaml"), files.openai);
  }
}

function harnessErrors(root: string): string[] {
  const spy = spyOn(console, "error").mockImplementation(() => {});
  try {
    checkAgentHarness(["--root", root]);
    return spy.mock.calls.map((call) => String(call[0]));
  } finally {
    spy.mockRestore();
  }
}

test("reports an explicitOnly vendored skill that still loads implicitly", () => {
  const root = createRoot();
  writeVendoredSkill(root, {
    skill: "---\nname: example-skill\ndescription: Example\n---\n",
  });

  const errors = harnessErrors(root).join("\n");
  expect(errors).toContain("needs disable-model-invocation: true");
  expect(errors).toContain("needs allow_implicit_invocation: false");
});

test("accepts an explicitOnly vendored skill with both flags applied", () => {
  const root = createRoot();
  writeVendoredSkill(root, {
    skill:
      "---\nname: example-skill\ndescription: Example\ndisable-model-invocation: true\n---\n",
    openai: "policy:\n  allow_implicit_invocation: false\n",
  });

  expect(harnessErrors(root).join("\n")).not.toContain("explicitOnly");
});
