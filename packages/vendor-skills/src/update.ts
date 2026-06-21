import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import matter from "gray-matter";
import { cloneSource, realExec } from "./git";
import { contentHash } from "./hash";
import { readJson, writeJson } from "./json";
import { createEmptyLock, sortedLock } from "./lock";
import {
  expectedSkillNames,
  selectedSources,
  validateManifest,
} from "./manifest";
import { pathsForRoot } from "./paths";
import type {
  Exec,
  Lock,
  Logger,
  Manifest,
  UpdateResult,
  VendorOptions,
} from "./types";

type UpdateInput = {
  root: string;
  options: VendorOptions;
  exec?: Exec;
  logger?: Logger;
};

const defaultLogger: Logger = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

function frontmatterName(skillDir: string): string {
  const skillFile = join(skillDir, "SKILL.md");
  const { data } = matter(readFileSync(skillFile, "utf8"));
  if (typeof data.name !== "string" || typeof data.description !== "string") {
    throw new Error(`${skillFile}: missing name or description`);
  }

  return data.name;
}

/** Update or check vendored third-party skills from the configured manifest. */
export function updateThirdpartySkills(input: UpdateInput): UpdateResult {
  const paths = pathsForRoot(input.root);
  const logger = input.logger ?? defaultLogger;
  const exec = input.exec ?? realExec;
  const manifest = readJson<Manifest>(paths.manifestPath);
  validateManifest(manifest, paths);

  const currentLock = existsSync(paths.lockPath)
    ? readJson<Lock>(paths.lockPath)
    : createEmptyLock();
  const nextSkills = input.options.filter ? { ...currentLock.skills } : {};
  const expectedSkills = expectedSkillNames(manifest);
  const tempRoot = mkdtempSync(join(tmpdir(), "agentic-thirdparty-skills-"));
  const changed: string[] = [];
  const checked: string[] = [];

  try {
    for (const source of selectedSources(manifest, input.options)) {
      const cloneDir = cloneSource(source, tempRoot, paths.root, exec);
      const resolvedCommit = exec("git", ["rev-parse", "HEAD"], cloneDir);

      for (const skill of source.skills) {
        checked.push(skill.name);
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
        const vendorDir = join(paths.vendorRoot, skill.name);

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
          if (input.options.dryRun) {
            logger.log(`would update ${skill.name}`);
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
          logger.log(`updated ${skill.name}`);
        } else {
          logger.log(`unchanged ${skill.name}`);
        }
      }
    }

    if (!input.options.filter) {
      for (const name of Object.keys(currentLock.skills)) {
        if (expectedSkills.has(name)) {
          continue;
        }

        changed.push(name);
        if (input.options.dryRun) {
          logger.log(`would remove ${name}`);
        } else {
          rmSync(join(paths.vendorRoot, name), {
            recursive: true,
            force: true,
          });
          logger.log(`removed ${name}`);
        }
      }

      if (existsSync(paths.vendorRoot)) {
        for (const entry of readdirSync(paths.vendorRoot, {
          withFileTypes: true,
        })) {
          if (!entry.isDirectory() || expectedSkills.has(entry.name)) {
            continue;
          }

          changed.push(entry.name);
          if (input.options.dryRun) {
            logger.log(`would remove ${entry.name}`);
          } else {
            rmSync(join(paths.vendorRoot, entry.name), {
              recursive: true,
              force: true,
            });
            logger.log(`removed ${entry.name}`);
          }
        }
      }
    }

    if (input.options.check && changed.length > 0) {
      logger.error(`third-party skills out of date: ${changed.join(", ")}`);
      return {
        changed,
        checked,
        ok: false,
      };
    }

    if (!input.options.dryRun) {
      writeJson(paths.lockPath, sortedLock(nextSkills));
    }

    return {
      changed,
      checked,
      ok: true,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
