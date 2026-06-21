#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import matter from "gray-matter";

type Marketplace = {
  plugins?: Array<{
    name?: string;
    source?: string;
    version?: string;
  }>;
};

type PluginManifest = {
  name?: string;
  version?: string;
};

type ThirdpartyManifest = {
  version?: number;
  sources?: ThirdpartySource[];
};

type ThirdpartySource = {
  id?: string;
  type?: string;
  url?: string;
  ref?: string;
  skills?: ThirdpartySkill[];
};

type ThirdpartySkill = {
  name?: string;
  path?: string;
};

type ThirdpartyLock = {
  version?: number;
  skills?: Record<string, ThirdpartyLockEntry>;
};

type ThirdpartyLockEntry = {
  manifestSourceId?: string;
  sourceType?: string;
  sourceUrl?: string;
  ref?: string;
  resolvedCommit?: string;
  upstreamPath?: string;
  contentHash?: string;
  skillsCliVersion?: string | null;
};

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
let failed = false;

function reportError(message: string): void {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportError(`${path}: invalid JSON (${message})`);
    return null;
  }
}

function subdirs(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(path, entry.name));
}

function skillFiles(): string[] {
  const rootSkills = subdirs("skills")
    .map((skillDir) => join(skillDir, "SKILL.md"))
    .filter(existsSync);

  const thirdpartySkills = subdirs("thirdparty/skills")
    .map((skillDir) => join(skillDir, "SKILL.md"))
    .filter(existsSync);

  const pluginSkills = subdirs("plugins").flatMap((pluginDir) =>
    subdirs(join(pluginDir, "skills")).flatMap((skillsDir) =>
      subdirs(skillsDir)
        .map((skillDir) => join(skillDir, "SKILL.md"))
        .filter(existsSync),
    ),
  );

  return [...rootSkills, ...thirdpartySkills, ...pluginSkills].sort();
}

function frontmatterName(path: string): string | null {
  try {
    const { data } = matter(readFileSync(path, "utf8"));
    const name = data.name;
    return typeof name === "string" ? name : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    reportError(`${path}: invalid frontmatter (${message})`);
    return null;
  }
}

function checkSkillNames(): void {
  for (const skillFile of skillFiles()) {
    const expected = basename(dirname(skillFile));
    const name = frontmatterName(skillFile);

    if (!name) {
      reportError(`${skillFile}: missing frontmatter name`);
      continue;
    }

    if (!slugPattern.test(name)) {
      reportError(`${skillFile}: name '${name}' is not a slug`);
    }

    if (name !== expected) {
      reportError(`${skillFile}: name '${name}' should match '${expected}'`);
    }
  }
}

function checkPluginVersions(): void {
  const marketplacePath = ".claude-plugin/marketplace.json";

  if (!existsSync(marketplacePath)) {
    reportError(`${marketplacePath}: missing marketplace manifest`);
    return;
  }

  const marketplace = readJson<Marketplace>(marketplacePath);
  if (!marketplace) {
    return;
  }

  const marketplacePlugins = marketplace.plugins ?? [];
  for (const pluginDir of subdirs("plugins")) {
    const manifestPath = join(pluginDir, ".claude-plugin", "plugin.json");
    if (!existsSync(manifestPath)) {
      continue;
    }

    const manifest = readJson<PluginManifest>(manifestPath);
    if (!manifest) {
      continue;
    }

    const expectedName = basename(pluginDir);
    const name = manifest.name ?? "";
    const version = manifest.version ?? "";

    if (name !== expectedName) {
      reportError(
        `${manifestPath}: name '${name}' should match '${expectedName}'`,
      );
    }

    if (!slugPattern.test(name)) {
      reportError(`${manifestPath}: name '${name}' is not a slug`);
    }

    if (!version) {
      reportError(`${manifestPath}: missing version`);
      continue;
    }

    const matches = marketplacePlugins.filter((plugin) => plugin.name === name);
    if (matches.length !== 1) {
      reportError(
        `${marketplacePath}: expected one entry for plugin '${name}'`,
      );
      continue;
    }

    const [marketPlugin] = matches;
    if (marketPlugin.version !== version) {
      const marketplaceVersion = marketPlugin.version;
      reportError(
        [
          `${name}: plugin version ${version}`,
          `!= marketplace ${marketplaceVersion}`,
        ].join(" "),
      );
    }

    const expectedSource = `./plugins/${name}`;
    if (marketPlugin.source !== expectedSource) {
      reportError(
        `${name}: marketplace source '${marketPlugin.source}' is unexpected`,
      );
    }
  }
}

function assertSlug(name: string | undefined, path: string): boolean {
  if (!name) {
    reportError(`${path}: missing name`);
    return false;
  }

  if (!slugPattern.test(name)) {
    reportError(`${path}: name '${name}' is not a slug`);
    return false;
  }

  return true;
}

function isSafeRelativePath(path: string): boolean {
  return !path.startsWith("/") && !path.split(/[\\/]/).includes("..");
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

function checkThirdpartySkills(): void {
  const manifestPath = "thirdparty/skills.manifest.json";
  const lockPath = "thirdparty/skills.lock.json";

  if (!existsSync(manifestPath) && !existsSync("thirdparty/skills")) {
    return;
  }

  if (!existsSync(manifestPath)) {
    reportError(`${manifestPath}: missing third-party skill manifest`);
    return;
  }

  if (!existsSync(lockPath)) {
    reportError(`${lockPath}: missing third-party skill lock`);
    return;
  }

  const manifest = readJson<ThirdpartyManifest>(manifestPath);
  const lock = readJson<ThirdpartyLock>(lockPath);
  if (!manifest || !lock) {
    return;
  }

  if (manifest.version !== 1) {
    reportError(`${manifestPath}: unsupported version`);
  }

  if (lock.version !== 1) {
    reportError(`${lockPath}: unsupported version`);
  }

  const lockSkills = lock.skills ?? {};
  const expectedSkills = new Set<string>();
  const sourceIds = new Set<string>();

  for (const source of manifest.sources ?? []) {
    const sourceId = source.id;
    if (!assertSlug(sourceId, manifestPath)) {
      continue;
    }

    if (sourceIds.has(sourceId)) {
      reportError(`${manifestPath}: duplicate source id '${sourceId}'`);
    }
    sourceIds.add(sourceId);

    if (source.type !== "git") {
      reportError(`${manifestPath}: source '${sourceId}' must be type git`);
    }

    if (!source.url || !source.ref) {
      reportError(`${manifestPath}: source '${sourceId}' missing url or ref`);
    }

    for (const skill of source.skills ?? []) {
      const name = skill.name;
      if (!assertSlug(name, manifestPath)) {
        continue;
      }

      if (!skill.path || !isSafeRelativePath(skill.path)) {
        reportError(`${manifestPath}: '${name}' has unsafe path`);
        continue;
      }

      if (expectedSkills.has(name)) {
        reportError(`${manifestPath}: duplicate skill '${name}'`);
      }
      expectedSkills.add(name);

      const skillDir = join("thirdparty", "skills", name);
      const skillFile = join(skillDir, "SKILL.md");
      if (!existsSync(skillFile)) {
        reportError(`${skillFile}: vendored skill missing`);
        continue;
      }

      const frontmatter = frontmatterName(skillFile);
      if (frontmatter !== name) {
        reportError(`${skillFile}: name '${frontmatter}' should match '${name}'`);
      }

      const lockEntry = lockSkills[name];
      if (!lockEntry) {
        reportError(`${lockPath}: missing lock entry for '${name}'`);
        continue;
      }

      if (lockEntry.manifestSourceId !== sourceId) {
        reportError(`${lockPath}: '${name}' has wrong source id`);
      }

      if (lockEntry.sourceType !== source.type) {
        reportError(`${lockPath}: '${name}' has wrong source type`);
      }

      if (lockEntry.sourceUrl !== source.url || lockEntry.ref !== source.ref) {
        reportError(`${lockPath}: '${name}' source does not match manifest`);
      }

      if (lockEntry.upstreamPath !== skill.path) {
        reportError(`${lockPath}: '${name}' path does not match manifest`);
      }

      if (!lockEntry.resolvedCommit) {
        reportError(`${lockPath}: '${name}' missing resolved commit`);
      }

      const actualHash = contentHash(skillDir);
      if (lockEntry.contentHash !== actualHash) {
        reportError(`${lockPath}: '${name}' content hash is stale`);
      }
    }
  }

  for (const name of Object.keys(lockSkills)) {
    if (!expectedSkills.has(name)) {
      reportError(`${lockPath}: unexpected lock entry '${name}'`);
    }
  }

  for (const skillDir of subdirs("thirdparty/skills")) {
    const name = basename(skillDir);
    if (!expectedSkills.has(name)) {
      reportError(`${skillDir}: vendored skill is not in manifest`);
    }

    try {
      if (!statSync(join(skillDir, "SKILL.md")).isFile()) {
        reportError(`${skillDir}: missing SKILL.md`);
      }
    } catch {
      reportError(`${skillDir}: missing SKILL.md`);
    }
  }
}

checkSkillNames();
checkPluginVersions();
checkThirdpartySkills();

if (failed) {
  process.exit(1);
}

console.log("Agent harness checks passed.");
