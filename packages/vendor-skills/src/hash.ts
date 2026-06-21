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
    const content = readFileSync(file);
    hash.update("path\0");
    hash.update(`${Buffer.byteLength(relativePath, "utf8")}\0`);
    hash.update(relativePath);
    hash.update("\0content\0");
    hash.update(`${content.length}\0`);
    hash.update(content);
    hash.update("\0");
  }

  return `sha256:${hash.digest("hex")}`;
}
