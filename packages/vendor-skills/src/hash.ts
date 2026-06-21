import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Collect regular files under a directory for vendored content hashing. */
export function collectFiles(baseDir: string, currentDir = baseDir): string[] {
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

/** Compute the stable content hash stored in the third-party skill lockfile. */
export function contentHash(dir: string): string {
  const hash = createHash("sha256");
  const files = collectFiles(dir).sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const relativePath = relative(dir, file).split(sep).join("/");
    hash.update(relativePath);
    hash.update(readFileSync(file));
  }

  return `sha256:${hash.digest("hex")}`;
}
