/** Normalize supported source shorthands to stable git URLs. */
export function normalizeSourceUrl(input: string): string {
  const value = input.trim();
  const shorthand = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
  const shorthandMatch = value.match(shorthand);
  if (shorthandMatch) {
    const [, owner, repo] = shorthandMatch;
    return `https://github.com/${owner}/${repo}.git`;
  }

  const githubHttps = value.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/,
  );
  if (githubHttps) {
    const [, owner, repo] = githubHttps;
    return `https://github.com/${owner}/${repo}.git`;
  }

  const githubSsh = value.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (githubSsh) {
    const [, owner, repo] = githubSsh;
    return `https://github.com/${owner}/${repo}.git`;
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/\.git$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "source"
  );
}

function githubParts(url: string): { owner: string; repo: string } | null {
  const match = normalizeSourceUrl(url).match(
    /^https:\/\/github\.com\/([^/]+)\/(.+?)\.git$/,
  );
  return match ? { owner: match[1], repo: match[2] } : null;
}

/** Generate a stable source id for a new manifest source. */
export function sourceIdForUrl(url: string, existingIds: Set<string>): string {
  const parts = githubParts(url);
  const candidates = parts
    ? [slugify(parts.repo), slugify(`${parts.owner}-${parts.repo}`)]
    : [slugify(url.split(/[\\/]/).at(-1) ?? url)];

  for (const candidate of candidates) {
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }

  const base = candidates.at(-1) ?? "source";
  for (let i = 2; ; i += 1) {
    const candidate = `${base}-${i}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
}
