import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import matter from "gray-matter";
import { assertSlug } from "./manifest";

/** Upstream skill discovered from a source checkout. */
export type DiscoveredSkill = {
  name: string;
  description: string;
  path: string;
};

/** Upstream skill whose metadata cannot be safely vendored. */
export type InvalidSkill = {
  path: string;
  error: string;
};

/** Valid and invalid skills found in an upstream checkout. */
export type SkillDiscovery = {
  skills: DiscoveredSkill[];
  invalid: InvalidSkill[];
};

function skillDirs(baseDir: string, currentDir = baseDir): string[] {
  return readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") {
      return [];
    }

    const fullPath = join(currentDir, entry.name);
    if (!entry.isDirectory()) {
      return [];
    }

    if (
      readdirSync(fullPath, { withFileTypes: true }).some((child) => {
        return child.isFile() && child.name === "SKILL.md";
      })
    ) {
      return [fullPath];
    }

    return skillDirs(baseDir, fullPath);
  });
}

/** Discover valid skills without letting one invalid sibling abort discovery. */
export function discoverSkills(checkoutDir: string): SkillDiscovery {
  const skills: DiscoveredSkill[] = [];
  const invalid: InvalidSkill[] = [];

  for (const skillDir of skillDirs(checkoutDir)) {
    const path = relative(checkoutDir, skillDir).split(sep).join("/");

    try {
      const { data } = matter(readFileSync(join(skillDir, "SKILL.md"), "utf8"));
      if (
        typeof data.name !== "string" ||
        typeof data.description !== "string"
      ) {
        throw new Error("missing name or description");
      }

      assertSlug(data.name, "name");

      skills.push({
        name: data.name,
        description: data.description,
        path,
      });
    } catch (error) {
      invalid.push({
        path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
    invalid: invalid.sort((a, b) => a.path.localeCompare(b.path)),
  };
}
