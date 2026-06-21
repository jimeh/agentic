#!/usr/bin/env bun

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import matter from "gray-matter";

type Manifest = {
  version: number;
  sources: Source[];
};

type Source = {
  id: string;
  type: "git";
  url: string;
  ref: string;
  skills: SkillSelection[];
};

type SkillSelection = {
  name: string;
  path: string;
};

type Lock = {
  version: number;
  skills: Record<string, LockEntry>;
};

type LockEntry = {
  manifestSourceId: string;
  sourceType: "git";
  sourceUrl: string;
  ref: string;
  resolvedCommit: string;
  upstreamPath: string;
  contentHash: string;
  skillsCliVersion: string | null;
};

type Options = {
  dryRun: boolean;
  check: boolean;
  filter: Set<string> | null;
};

const root = resolve(import.meta.dir, "..");
const manifestPath = join(root, "thirdparty", "skills.manifest.json");
const lockPath = join(root, "thirdparty", "skills.lock.json");
const vendorRoot = join(root, "thirdparty", "skills");
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: update-thirdparty-skills.ts [--dry-run] [--check]",
      "       update-thirdparty-skills.ts [--skill <name> ...]",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseArgs(args: string[]): Options {
  const skills: string[] = [];
  let dryRun = false;
  let check = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "-n") {
      dryRun = true;
    } else if (arg === "--check") {
      check = true;
      dryRun = true;
    } else if (arg === "--skill") {
      const name = args[i + 1];
      if (!name || name.startsWith("-")) {
        usage();
      }
      skills.push(name);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
    }
  }

  return {
    dryRun,
    check,
    filter: skills.length > 0 ? new Set(skills) : null,
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function run(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed\n${output}`);
  }

  return result.stdout.trim();
}

function assertSlug(name: string, context: string): void {
  if (!slugPattern.test(name)) {
    throw new Error(`${context}: '${name}' is not a slug`);
  }
}

function assertSafeRelativePath(path: string, context: string): void {
  if (path.startsWith("/") || path.split(/[\\/]/).includes("..")) {
    throw new Error(`${context}: path '${path}' must stay inside the source`);
  }
}

function collectFiles(baseDir: string, currentDir = baseDir): string[] {
  return readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") {
      return [];
    }

    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(baseDir, fullPath);
    }

    if (!entry.isFile()) {
      return [];
    }

    return [fullPath];
  });
}

function contentHash(dir: string): string {
  const hash = createHash("sha256");
  const files = collectFiles(dir).sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const relativePath = relative(dir, file).split(sep).join("/");
    hash.update(relativePath);
    hash.update(readFileSync(file));
  }

  return `sha256:${hash.digest("hex")}`;
}

function frontmatterName(skillDir: string): string {
  const skillFile = join(skillDir, "SKILL.md");
  const { data } = matter(readFileSync(skillFile, "utf8"));
  if (typeof data.name !== "string" || typeof data.description !== "string") {
    throw new Error(`${skillFile}: missing name or description`);
  }

  return data.name;
}

function cloneSource(source: Source, tempRoot: string): string {
  const cloneDir = join(tempRoot, source.id);
  run(
    "git",
    [
      "clone",
      "--quiet",
      "--filter=blob:none",
      "--no-checkout",
      source.url,
      cloneDir,
    ],
    root,
  );
  run("git", ["checkout", "--quiet", source.ref], cloneDir);
  return cloneDir;
}

function selectedSources(manifest: Manifest, options: Options): Source[] {
  if (options.filter) {
    const knownSkills = new Set(
      manifest.sources.flatMap((source) =>
        source.skills.map((skill) => skill.name),
      ),
    );
    const unknown = [...options.filter].filter((name) => !knownSkills.has(name));
    if (unknown.length > 0) {
      throw new Error(`unknown skill filter: ${unknown.join(", ")}`);
    }
  }

  return manifest.sources
    .map((source) => ({
      ...source,
      skills: source.skills.filter((skill) => {
        return !options.filter || options.filter.has(skill.name);
      }),
    }))
    .filter((source) => source.skills.length > 0);
}

function validateManifest(manifest: Manifest): void {
  if (manifest.version !== 1) {
    throw new Error(`${manifestPath}: unsupported manifest version`);
  }

  const names = new Set<string>();
  const sourceIds = new Set<string>();

  for (const source of manifest.sources) {
    assertSlug(source.id, `source id`);
    if (sourceIds.has(source.id)) {
      throw new Error(`${manifestPath}: duplicate source id '${source.id}'`);
    }
    sourceIds.add(source.id);

    for (const skill of source.skills) {
      assertSlug(skill.name, `skill name`);
      assertSafeRelativePath(skill.path, `${skill.name} path`);
      if (names.has(skill.name)) {
        throw new Error(`${manifestPath}: duplicate skill '${skill.name}'`);
      }
      names.add(skill.name);
    }
  }
}

function sortedLock(skills: Record<string, LockEntry>): Lock {
  return {
    version: 1,
    skills: Object.fromEntries(
      Object.entries(skills).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

function update(options: Options): void {
  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);

  const currentLock = existsSync(lockPath)
    ? readJson<Lock>(lockPath)
    : { version: 1, skills: {} };
  const nextSkills: Record<string, LockEntry> = options.filter
    ? { ...currentLock.skills }
    : {};
  const expectedSkills = new Set(
    manifest.sources.flatMap((source) =>
      source.skills.map((skill) => skill.name),
    ),
  );
  const tempRoot = mkdtempSync(join(tmpdir(), "agentic-thirdparty-skills-"));
  const changed: string[] = [];

  try {
    for (const source of selectedSources(manifest, options)) {
      const cloneDir = cloneSource(source, tempRoot);
      const resolvedCommit = run("git", ["rev-parse", "HEAD"], cloneDir);

      for (const skill of source.skills) {
        const upstreamDir = join(cloneDir, skill.path);
        if (!existsSync(join(upstreamDir, "SKILL.md"))) {
          throw new Error(`${skill.name}: ${skill.path}/SKILL.md not found`);
        }

        const actualName = frontmatterName(upstreamDir);
        if (actualName !== skill.name) {
          throw new Error(
            `${skill.name}: frontmatter name '${actualName}' does not match`,
          );
        }

        const nextHash = contentHash(upstreamDir);
        const currentHash = currentLock.skills[skill.name]?.contentHash;
        const vendorDir = join(vendorRoot, skill.name);

        nextSkills[skill.name] = {
          manifestSourceId: source.id,
          sourceType: "git",
          sourceUrl: source.url,
          ref: source.ref,
          resolvedCommit,
          upstreamPath: skill.path,
          contentHash: nextHash,
          skillsCliVersion: null,
        };

        if (currentHash !== nextHash || !existsSync(vendorDir)) {
          changed.push(skill.name);
          if (options.dryRun) {
            console.log(`would update ${skill.name}`);
            continue;
          }

          rmSync(vendorDir, { recursive: true, force: true });
          mkdirSync(dirname(vendorDir), { recursive: true });
          cpSync(upstreamDir, vendorDir, {
            recursive: true,
            filter: (src) => {
              const name = basename(src);
              return name !== ".git" && name !== "node_modules";
            },
          });
          console.log(`updated ${skill.name}`);
        } else {
          console.log(`unchanged ${skill.name}`);
        }
      }
    }

    if (!options.filter) {
      for (const name of Object.keys(currentLock.skills)) {
        if (expectedSkills.has(name)) {
          continue;
        }

        changed.push(name);
        if (options.dryRun) {
          console.log(`would remove ${name}`);
        } else {
          rmSync(join(vendorRoot, name), { recursive: true, force: true });
          console.log(`removed ${name}`);
        }
      }

      if (existsSync(vendorRoot)) {
        for (const entry of readdirSync(vendorRoot, { withFileTypes: true })) {
          if (!entry.isDirectory() || expectedSkills.has(entry.name)) {
            continue;
          }

          changed.push(entry.name);
          if (options.dryRun) {
            console.log(`would remove ${entry.name}`);
          } else {
            rmSync(join(vendorRoot, entry.name), {
              recursive: true,
              force: true,
            });
            console.log(`removed ${entry.name}`);
          }
        }
      }
    }

    if (options.check && changed.length > 0) {
      console.error(`third-party skills out of date: ${changed.join(", ")}`);
      process.exitCode = 1;
      return;
    }

    if (!options.dryRun) {
      writeJson(lockPath, sortedLock(nextSkills));
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

try {
  update(parseArgs(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
