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

/** Discover skill directories in a checked-out upstream repository. */
export function discoverSkills(checkoutDir: string): DiscoveredSkill[] {
  return skillDirs(checkoutDir)
    .map((skillDir) => {
      const skillFile = join(skillDir, "SKILL.md");
      const { data } = matter(readFileSync(skillFile, "utf8"));
      if (
        typeof data.name !== "string" ||
        typeof data.description !== "string"
      ) {
        throw new Error(`${skillFile}: missing name or description`);
      }

      assertSlug(data.name, `${skillFile} name`);

      return {
        name: data.name,
        description: data.description,
        path: relative(checkoutDir, skillDir).split(sep).join("/"),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
