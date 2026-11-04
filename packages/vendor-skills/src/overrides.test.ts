import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { applyOverrides, parseYamlMap } from "./overrides";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const plainSkill =
  "---\nname: example\ndescription: Example\n---\n\n# Example\n";

function skill(files: { skill?: string; openai?: string }): string {
  const dir = mkdtempSync(join(tmpdir(), "agentic-overrides-"));
  dirs.push(dir);
  writeFileSync(join(dir, "SKILL.md"), files.skill ?? plainSkill);
  if (files.openai !== undefined) {
    mkdirSync(join(dir, "agents"));
    writeFileSync(join(dir, "agents", "openai.yaml"), files.openai);
  }
  return dir;
}

function openai(dir: string): Record<string, unknown> {
  return parseYamlMap(readFileSync(join(dir, "agents", "openai.yaml"), "utf8"));
}

test("explicitOnly follows the policy block's own indentation and comments", () => {
  const dir = skill({
    openai: "policy: # Codex policy\n    products:\n      - codex\n",
  });

  applyOverrides(dir, { explicitOnly: true });

  expect(openai(dir)).toEqual({
    policy: { allow_implicit_invocation: false, products: ["codex"] },
  });
});

test("explicitOnly changes only the real policy key, not look-alike text", () => {
  const dir = skill({
    openai: [
      "interface:",
      "  short_description: >",
      "    allow_implicit_invocation: false",
      "policy:",
      "  allow_implicit_invocation: true",
      "",
    ].join("\n"),
  });

  applyOverrides(dir, { explicitOnly: true });

  expect(openai(dir)).toEqual({
    interface: { short_description: "allow_implicit_invocation: false\n" },
    policy: { allow_implicit_invocation: false },
  });
});

test("explicitOnly refuses YAML shapes it cannot edit safely", () => {
  const shapes = [
    "policy: { allow_implicit_invocation: true }\n",
    'policy:\n  "allow_implicit_invocation": true\n',
  ];
  for (const shape of shapes) {
    const dir = skill({ openai: shape });
    expect(() => applyOverrides(dir, { explicitOnly: true })).toThrow(
      "cannot apply explicitOnly",
    );
  }

  const quotedFrontmatter = skill({
    skill:
      '---\nname: example\ndescription: Example\n"disable-model-invocation": false\n---\n',
  });
  expect(() =>
    applyOverrides(quotedFrontmatter, { explicitOnly: true }),
  ).toThrow("cannot apply explicitOnly");
});
