import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { addThirdpartySkills } from "./add";
import { realExec } from "./git";
import type { Exec, Lock, Manifest } from "./types";
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

async function expectRejects(
  promise: Promise<unknown>,
  message: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(message);
    return;
  }

  throw new Error("expected promise to reject");
}

test("add appends selected skills to an existing source", async () => {
  const temp = project();

  const result = await addThirdpartySkills({
    root: temp.root,
    options: {
      source: temp.upstream,
      ref: null,
      dryRun: false,
      skills: ["second-skill"],
    },
    logger: silentLogger,
  });

  const manifest = readJson<Manifest>(
    join(temp.root, "thirdparty", "skills.manifest.json"),
  );

  expect(result.added).toEqual(["second-skill"]);
  expect(manifest.sources).toHaveLength(1);
  expect(manifest.sources[0].skills.map((skill) => skill.name)).toEqual([
    "example-skill",
    "second-skill",
  ]);
  expect(
    existsSync(join(temp.root, "thirdparty", "skills", "second-skill")),
  ).toBe(true);

  const lock = readJson<Lock>(
    join(temp.root, "thirdparty", "skills.lock.json"),
  );
  expect(lock.skills["second-skill"].upstreamPath).toBe("skills/second-skill");
});

test("add creates and vendors a new source when the URL is not configured", async () => {
  const temp = project();
  write(
    join(temp.root, "thirdparty", "skills.manifest.json"),
    `${JSON.stringify({ version: 1, sources: [] }, null, 2)}\n`,
  );

  await addThirdpartySkills({
    root: temp.root,
    options: {
      source: temp.upstream,
      ref: "main",
      dryRun: false,
      skills: ["example-skill"],
    },
    logger: silentLogger,
  });

  const manifest = readJson<Manifest>(
    join(temp.root, "thirdparty", "skills.manifest.json"),
  );

  expect(manifest.sources).toHaveLength(1);
  expect(manifest.sources[0].url).toBe(temp.upstream);
  expect(manifest.sources[0].ref).toBe("main");
  expect(manifest.sources[0].skills).toEqual([
    { name: "example-skill", path: "skills/example-skill" },
  ]);
  expect(
    existsSync(join(temp.root, "thirdparty", "skills", "example-skill")),
  ).toBe(true);
});

test("add records skill-level refs when they differ from source ref", async () => {
  const temp = project();

  await addThirdpartySkills({
    root: temp.root,
    options: {
      source: temp.upstream,
      ref: temp.initialCommit,
      dryRun: false,
      skills: ["second-skill"],
    },
    logger: silentLogger,
  });

  const manifest = readJson<Manifest>(
    join(temp.root, "thirdparty", "skills.manifest.json"),
  );
  const added = manifest.sources[0].skills.find((skill) => {
    return skill.name === "second-skill";
  });

  expect(added).toEqual({
    name: "second-skill",
    path: "skills/second-skill",
    ref: temp.initialCommit,
  });

  const lock = readJson<Lock>(
    join(temp.root, "thirdparty", "skills.lock.json"),
  );
  expect(lock.skills["second-skill"].ref).toBe(temp.initialCommit);
});

test("add dry-run does not write the manifest", async () => {
  const temp = project();

  await addThirdpartySkills({
    root: temp.root,
    options: {
      source: temp.upstream,
      ref: null,
      dryRun: true,
      skills: ["second-skill"],
    },
    logger: silentLogger,
  });

  const manifest = readJson<Manifest>(
    join(temp.root, "thirdparty", "skills.manifest.json"),
  );

  expect(
    manifest.sources[0].skills.some((skill) => skill.name === "second-skill"),
  ).toBe(false);
  expect(existsSync(join(temp.root, "thirdparty", "skills.lock.json"))).toBe(
    false,
  );
});

test("add restores the manifest when vendoring fails", async () => {
  const temp = project();
  const manifestPath = join(temp.root, "thirdparty", "skills.manifest.json");
  const before = readJson<Manifest>(manifestPath);
  let cloneCount = 0;
  const exec: Exec = (command, args, cwd) => {
    if (command === "git" && args[0] === "clone") {
      cloneCount += 1;
      if (cloneCount === 2) {
        throw new Error("clone failed");
      }
    }
    return realExec(command, args, cwd);
  };

  await expectRejects(
    addThirdpartySkills({
      root: temp.root,
      options: {
        source: temp.upstream,
        ref: null,
        dryRun: false,
        skills: ["second-skill"],
      },
      exec,
      logger: silentLogger,
    }),
    "clone failed",
  );

  expect(readJson<Manifest>(manifestPath)).toEqual(before);
  expect(existsSync(join(temp.root, "thirdparty", "skills.lock.json"))).toBe(
    false,
  );
});

test("add rejects unknown selected skills and lists upstream names", async () => {
  const temp = project();

  await expectRejects(
    addThirdpartySkills({
      root: temp.root,
      options: {
        source: temp.upstream,
        ref: null,
        dryRun: false,
        skills: ["missing-skill"],
      },
      logger: silentLogger,
    }),
    "unknown skill: missing-skill (upstream has: example-skill, " +
      "second-skill, vendor-prefixed-skill)",
  );
});

test("add resolves skills by upstream directory name", async () => {
  const temp = project();

  const result = await addThirdpartySkills({
    root: temp.root,
    options: {
      source: temp.upstream,
      ref: null,
      dryRun: false,
      skills: ["prefixed-skill"],
    },
    logger: silentLogger,
  });

  expect(result.added).toEqual(["vendor-prefixed-skill"]);

  const manifest = readJson<Manifest>(
    join(temp.root, "thirdparty", "skills.manifest.json"),
  );
  expect(manifest.sources[0].skills).toContainEqual({
    name: "vendor-prefixed-skill",
    path: "skills/prefixed-skill",
  });
});

test("add explains when a requested skill is already in the manifest", async () => {
  const temp = project();

  await expectRejects(
    addThirdpartySkills({
      root: temp.root,
      options: {
        source: temp.upstream,
        ref: null,
        dryRun: false,
        skills: ["example-skill"],
      },
      logger: silentLogger,
    }),
    "skill already in manifest: example-skill " +
      "(run `mise run thirdparty:update-skills` to refresh it)",
  );
});

test("add prefers exact vendored names over directory basename matches", async () => {
  const temp = project();
  write(
    join(temp.upstream, "nested", "example-skill", "SKILL.md"),
    [
      "---",
      "name: nested-example-skill",
      "description: Different skill in a same-named directory",
      "---",
      "",
      "# Nested Example Skill",
      "",
    ].join("\n"),
  );
  run("git", ["add", "."], temp.upstream);
  run("git", ["commit", "--quiet", "-m", "add nested skill"], temp.upstream);

  await expectRejects(
    addThirdpartySkills({
      root: temp.root,
      options: {
        source: temp.upstream,
        ref: null,
        dryRun: false,
        skills: ["example-skill"],
      },
      logger: silentLogger,
    }),
    "skill already in manifest: example-skill",
  );
});

test("add reports already-vendored skills requested by directory name", async () => {
  const temp = project();

  await addThirdpartySkills({
    root: temp.root,
    options: {
      source: temp.upstream,
      ref: null,
      dryRun: false,
      skills: ["prefixed-skill"],
    },
    logger: silentLogger,
  });

  await expectRejects(
    addThirdpartySkills({
      root: temp.root,
      options: {
        source: temp.upstream,
        ref: null,
        dryRun: false,
        skills: ["prefixed-skill"],
      },
      logger: silentLogger,
    }),
    "skill already in manifest: vendor-prefixed-skill",
  );
});
