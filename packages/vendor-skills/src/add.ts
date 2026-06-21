import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSkills, type DiscoveredSkill } from "./discover";
import { cloneSource, realExec } from "./git";
import { validateManifest } from "./manifest";
import { pathsForRoot } from "./paths";
import { readJson, writeJson } from "./json";
import { normalizeSourceUrl, sourceIdForUrl } from "./source-url";
import type {
  AddOptions,
  Exec,
  Logger,
  Manifest,
  Source,
  UpdateResult,
} from "./types";
import { selectSkills } from "./prompt";
import { updateThirdpartySkills } from "./update";

type AddInput = {
  root: string;
  options: AddOptions;
  exec?: Exec;
  logger?: Logger;
  selector?: (skills: DiscoveredSkill[]) => Promise<DiscoveredSkill[]>;
};

/** Summary of a manifest add operation. */
export type AddResult = {
  added: string[];
  ok: boolean;
};

const defaultLogger: Logger = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
};

function emptyManifest(): Manifest {
  return { version: 1, sources: [] };
}

function readManifest(path: string): Manifest {
  return existsSync(path) ? readJson<Manifest>(path) : emptyManifest();
}

function findSource(manifest: Manifest, sourceUrl: string): Source | null {
  return (
    manifest.sources.find((source) => {
      return normalizeSourceUrl(source.url) === sourceUrl;
    }) ?? null
  );
}

function sourceForAdd(manifest: Manifest, sourceUrl: string, ref: string): Source {
  const existing = findSource(manifest, sourceUrl);
  if (existing) {
    return existing;
  }

  const source: Source = {
    id: sourceIdForUrl(
      sourceUrl,
      new Set(manifest.sources.map((candidate) => candidate.id)),
    ),
    type: "git",
    url: sourceUrl,
    ref,
    skills: [],
  };
  manifest.sources.push(source);
  return source;
}

function existingSkillKeys(source: Source): Set<string> {
  return new Set(
    source.skills.map((skill) => `${skill.path}\0${skill.ref ?? source.ref}`),
  );
}

function availableSkills(
  manifest: Manifest,
  source: Source,
  discovered: DiscoveredSkill[],
  ref: string,
): DiscoveredSkill[] {
  const manifestNames = new Set(
    manifest.sources.flatMap((candidate) =>
      candidate.skills.map((skill) => skill.name),
    ),
  );
  const sourceKeys = existingSkillKeys(source);

  return discovered.filter((skill) => {
    return (
      !manifestNames.has(skill.name) &&
      !sourceKeys.has(`${skill.path}\0${ref}`)
    );
  });
}

function skillsFromFlags(
  available: DiscoveredSkill[],
  requested: string[],
): DiscoveredSkill[] {
  if (requested.length === 0) {
    return [];
  }

  const byName = new Map(available.map((skill) => [skill.name, skill]));
  const missing = requested.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(`unknown available skill: ${missing.join(", ")}`);
  }

  return requested.map((name) => byName.get(name)!);
}

/** Add selected upstream skills to the source-controlled manifest. */
export async function addThirdpartySkills(input: AddInput): Promise<AddResult> {
  const paths = pathsForRoot(input.root);
  const logger = input.logger ?? defaultLogger;
  const exec = input.exec ?? realExec;
  const sourceUrl = normalizeSourceUrl(input.options.source);
  const manifest = readManifest(paths.manifestPath);
  validateManifest(manifest, paths);
  const previousManifest = existsSync(paths.manifestPath)
    ? readJson<Manifest>(paths.manifestPath)
    : null;

  const source = sourceForAdd(manifest, sourceUrl, input.options.ref ?? "main");
  const effectiveRef = input.options.ref ?? source.ref;
  const tempRoot = mkdtempSync(join(tmpdir(), "agentic-vendor-add-"));

  const restoreManifest = () => {
    if (previousManifest) {
      writeJson(paths.manifestPath, previousManifest);
    } else {
      rmSync(paths.manifestPath, { force: true });
    }
  };

  try {
    const cloneDir = cloneSource(
      source,
      tempRoot,
      paths.root,
      exec,
      effectiveRef,
      source.id,
    );
    const available = availableSkills(
      manifest,
      source,
      discoverSkills(cloneDir),
      effectiveRef,
    );

    if (available.length === 0) {
      logger.log("no new skills available");
      return { added: [], ok: true };
    }

    const selected =
      input.options.skills.length > 0
        ? skillsFromFlags(available, input.options.skills)
        : await (input.selector ?? selectSkills)(available);

    if (selected.length === 0) {
      logger.log("no skills selected");
      return { added: [], ok: true };
    }

    const nextSkills = selected.map((skill) => ({
      name: skill.name,
      path: skill.path,
      ...(effectiveRef === source.ref ? {} : { ref: effectiveRef }),
    }));

    if (input.options.dryRun) {
      for (const skill of nextSkills) {
        logger.log(`would add ${skill.name}`);
      }
      return { added: nextSkills.map((skill) => skill.name), ok: true };
    }

    source.skills = [...source.skills, ...nextSkills].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    validateManifest(manifest, paths);
    writeJson(paths.manifestPath, manifest);

    let updateResult: UpdateResult;
    try {
      updateResult = updateThirdpartySkills({
        root: input.root,
        options: {
          dryRun: false,
          check: false,
          filter: new Set(nextSkills.map((skill) => skill.name)),
        },
        exec,
        logger,
      });
    } catch (error) {
      restoreManifest();
      throw error;
    }

    if (!updateResult.ok) {
      restoreManifest();
      return { added: nextSkills.map((skill) => skill.name), ok: false };
    }

    for (const skill of nextSkills) {
      logger.log(`added ${skill.name}`);
    }

    return { added: nextSkills.map((skill) => skill.name), ok: true };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
