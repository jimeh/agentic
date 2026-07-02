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
