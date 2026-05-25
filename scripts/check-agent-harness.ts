#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
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

  const pluginSkills = subdirs("plugins").flatMap((pluginDir) =>
    subdirs(join(pluginDir, "skills")).flatMap((skillsDir) =>
      subdirs(skillsDir)
        .map((skillDir) => join(skillDir, "SKILL.md"))
        .filter(existsSync),
    ),
  );

  return [...rootSkills, ...pluginSkills].sort();
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

checkSkillNames();
checkPluginVersions();

if (failed) {
  process.exit(1);
}

console.log("Agent harness checks passed.");
