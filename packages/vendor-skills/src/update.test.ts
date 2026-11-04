import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import type { Lock, Manifest } from "./types";
import { updateThirdpartySkills } from "./update";
import { createTempProject, readJson, run, write } from "./test-helpers";

const projects: ReturnType<typeof createTempProject>[] = [];

afterEach(() => {
  for (const project of projects.splice(0)) {
    project.cleanup();
  }
});

function project(): ReturnType<typeof createTempProject> {
  const next = createTempProject();
  projects.push(next);
  return next;
}

const silentLogger = {
  log() {},
  error() {},
};

test("update vendors a selected skill and writes lock metadata", () => {
  const temp = project();
  const result = updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });

  expect(result.ok).toBe(true);
  expect(result.changed).toEqual(["example-skill"]);
  expect(
    existsSync(join(temp.root, "thirdparty", "skills", "example-skill")),
  ).toBe(true);

  const lock = readJson<Lock>(
    join(temp.root, "thirdparty", "skills.lock.json"),
  );
  const entry = lock.skills["example-skill"];

  expect(entry.sourceUrl).toBe(temp.upstream);
  expect(entry.ref).toBe("main");
  expect(entry.upstreamPath).toBe("skills/example-skill");
  expect(entry.resolvedCommit).toMatch(/^[0-9a-f]{40}$/);
  expect(entry.contentHash).toMatch(/^sha256:/);
});

test("check reports stale vendored skills without writing files", () => {
  const temp = project();
  updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });

  writeFileSync(
    join(temp.upstream, "skills", "example-skill", "README.md"),
    "changed\n",
  );
  run("git", ["add", "."], temp.upstream);
  run("git", ["commit", "--quiet", "-m", "change skill"], temp.upstream);

  const before = readFileSync(
    join(temp.root, "thirdparty", "skills", "example-skill", "README.md"),
    "utf8",
  );
  const result = updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: true, check: true, filter: null },
    logger: silentLogger,
  });
  const after = readFileSync(
    join(temp.root, "thirdparty", "skills", "example-skill", "README.md"),
    "utf8",
  );

  expect(result.ok).toBe(false);
  expect(result.changed).toEqual(["example-skill"]);
  expect(after).toBe(before);
});

test("full update prunes skills removed from the manifest", () => {
  const temp = project();
  updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });

  const manifest = readJson<Manifest>(
    join(temp.root, "thirdparty", "skills.manifest.json"),
  );
  manifest.sources[0].skills = [];
  write(
    join(temp.root, "thirdparty", "skills.manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const result = updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });

  expect(result.changed).toEqual(["example-skill"]);
  expect(
    existsSync(join(temp.root, "thirdparty", "skills", "example-skill")),
  ).toBe(false);
});

test("update honors a skill-level ref override", () => {
  const temp = project();
  const manifest = readJson<Manifest>(
    join(temp.root, "thirdparty", "skills.manifest.json"),
  );
  manifest.sources[0].skills[0].ref = temp.initialCommit;
  write(
    join(temp.root, "thirdparty", "skills.manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  writeFileSync(
    join(temp.upstream, "skills", "example-skill", "README.md"),
    "changed\n",
  );
  run("git", ["add", "."], temp.upstream);
  run("git", ["commit", "--quiet", "-m", "change skill"], temp.upstream);

  updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });

  const lock = readJson<Lock>(
    join(temp.root, "thirdparty", "skills.lock.json"),
  );
  const content = readFileSync(
    join(temp.root, "thirdparty", "skills", "example-skill", "README.md"),
    "utf8",
  );

  expect(lock.skills["example-skill"].ref).toBe(temp.initialCommit);
  expect(content).toBe("hello\n");
});

function setExplicitOnly(root: string): void {
  const manifestPath = join(root, "thirdparty", "skills.manifest.json");
  const manifest = readJson<Manifest>(manifestPath);
  manifest.sources[0].skills[0].overrides = { explicitOnly: true };
  write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function vendored(root: string, ...parts: string[]): string {
  return readFileSync(
    join(root, "thirdparty", "skills", "example-skill", ...parts),
    "utf8",
  );
}

test("explicitOnly marks the vendored skill and locks the patched content", () => {
  const temp = project();
  setExplicitOnly(temp.root);

  updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });

  expect(vendored(temp.root, "SKILL.md")).toBe(
    [
      "---",
      "name: example-skill",
      "description: Example skill",
      "disable-model-invocation: true",
      "---",
      "",
      "# Example Skill",
      "",
    ].join("\n"),
  );
  expect(vendored(temp.root, "agents", "openai.yaml")).toBe(
    "policy:\n  allow_implicit_invocation: false\n",
  );
  expect(
    readFileSync(
      join(temp.upstream, "skills", "example-skill", "SKILL.md"),
      "utf8",
    ),
  ).not.toContain("disable-model-invocation");

  const recheck = updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: true, check: true, filter: null },
    logger: silentLogger,
  });
  expect(recheck.ok).toBe(true);
  expect(recheck.changed).toEqual([]);
});

test("explicitOnly replaces upstream invocation settings in place", () => {
  const temp = project();
  const upstreamSkill = join(temp.upstream, "skills", "example-skill");
  write(
    join(upstreamSkill, "SKILL.md"),
    [
      "---",
      "name: example-skill",
      "disable-model-invocation: false",
      "description: Example skill",
      "---",
      "",
      "# Example Skill",
      "",
    ].join("\n"),
  );
  write(
    join(upstreamSkill, "agents", "openai.yaml"),
    [
      "interface:",
      '  display_name: "Example"',
      "policy:",
      "  allow_implicit_invocation: true",
      "",
    ].join("\n"),
  );
  run("git", ["add", "."], temp.upstream);
  run("git", ["commit", "--quiet", "-m", "add invocation"], temp.upstream);
  setExplicitOnly(temp.root);

  updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });

  const skill = vendored(temp.root, "SKILL.md");
  expect(skill).toContain("disable-model-invocation: true\n");
  expect(skill).not.toContain("disable-model-invocation: false");
  expect(vendored(temp.root, "agents", "openai.yaml")).toBe(
    [
      "interface:",
      '  display_name: "Example"',
      "policy:",
      "  allow_implicit_invocation: false",
      "",
    ].join("\n"),
  );
});

test("adding an override re-vendors an otherwise unchanged skill", () => {
  const temp = project();
  updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });
  setExplicitOnly(temp.root);

  const check = updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: true, check: true, filter: null },
    logger: silentLogger,
  });
  expect(check.ok).toBe(false);
  expect(check.changed).toEqual(["example-skill"]);

  updateThirdpartySkills({
    root: temp.root,
    options: { dryRun: false, check: false, filter: null },
    logger: silentLogger,
  });
  expect(vendored(temp.root, "SKILL.md")).toContain(
    "disable-model-invocation: true",
  );
});
