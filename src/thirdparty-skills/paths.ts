import { join, resolve } from "node:path";
import type { VendorPaths } from "./types";

/** Resolve third-party skill paths from a repository root. */
export function pathsForRoot(root: string): VendorPaths {
  const resolvedRoot = resolve(root);

  return {
    root: resolvedRoot,
    manifestPath: join(resolvedRoot, "thirdparty", "skills.manifest.json"),
    lockPath: join(resolvedRoot, "thirdparty", "skills.lock.json"),
    vendorRoot: join(resolvedRoot, "thirdparty", "skills"),
  };
}
