import type { Manifest, Source, VendorOptions, VendorPaths } from "./types";

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Assert that a manifest identifier is a lowercase slug. */
export function assertSlug(name: string, context: string): void {
  if (!slugPattern.test(name)) {
    throw new Error(`${context}: '${name}' is not a slug`);
  }
}

/** Assert that a manifest path cannot escape its upstream source checkout. */
export function assertSafeRelativePath(path: string, context: string): void {
  if (path.startsWith("/") || path.split(/[\\/]/).includes("..")) {
    throw new Error(`${context}: path '${path}' must stay inside the source`);
  }
}

/** Validate the shape and invariants of the source-controlled manifest. */
export function validateManifest(
  manifest: Manifest,
  paths: VendorPaths,
): void {
  if (manifest.version !== 1) {
    throw new Error(`${paths.manifestPath}: unsupported manifest version`);
  }

  const names = new Set<string>();
  const sourceIds = new Set<string>();

  for (const source of manifest.sources) {
    assertSlug(source.id, "source id");
    if (sourceIds.has(source.id)) {
      throw new Error(
        `${paths.manifestPath}: duplicate source id '${source.id}'`,
      );
    }
    sourceIds.add(source.id);

    if (source.type !== "git") {
      throw new Error(`${paths.manifestPath}: source '${source.id}' not git`);
    }

    for (const skill of source.skills) {
      assertSlug(skill.name, "skill name");
      assertSafeRelativePath(skill.path, `${skill.name} path`);
      if (skill.ref !== undefined && skill.ref.trim() === "") {
        throw new Error(`${paths.manifestPath}: '${skill.name}' has empty ref`);
      }
      if (names.has(skill.name)) {
        throw new Error(
          `${paths.manifestPath}: duplicate skill '${skill.name}'`,
        );
      }
      names.add(skill.name);
    }
  }
}

/** Return the set of skill names declared by the manifest. */
export function expectedSkillNames(manifest: Manifest): Set<string> {
  return new Set(
    manifest.sources.flatMap((source) =>
      source.skills.map((skill) => skill.name),
    ),
  );
}

/** Return manifest sources narrowed to the selected skill filter. */
export function selectedSources(
  manifest: Manifest,
  options: VendorOptions,
): Source[] {
  if (options.filter) {
    const knownSkills = expectedSkillNames(manifest);
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
