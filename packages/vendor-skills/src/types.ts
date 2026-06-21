/** Source-controlled third-party skill update manifest. */
export type Manifest = {
  version: number;
  sources: Source[];
};

/** Upstream repository that contains one or more selected skills. */
export type Source = {
  id: string;
  type: "git";
  url: string;
  ref: string;
  skills: SkillSelection[];
};

/** Single upstream skill directory selected for vendoring. */
export type SkillSelection = {
  name: string;
  path: string;
  ref?: string;
};

/** Lockfile containing resolved upstream metadata for vendored skills. */
export type Lock = {
  version: number;
  skills: Record<string, LockEntry>;
};

/** Resolved metadata for one vendored skill. */
export type LockEntry = {
  manifestSourceId: string;
  sourceType: "git";
  sourceUrl: string;
  ref: string;
  resolvedCommit: string;
  upstreamPath: string;
  contentHash: string;
  skillsCliVersion: string | null;
};

/** Repository paths used by the third-party skill updater. */
export type VendorPaths = {
  root: string;
  manifestPath: string;
  lockPath: string;
  vendorRoot: string;
};

/** Runtime options for update and check operations. */
export type VendorOptions = {
  dryRun: boolean;
  check: boolean;
  filter: Set<string> | null;
};

/** Runtime options for adding skills to the source-controlled manifest. */
export type AddOptions = {
  source: string;
  ref: string | null;
  dryRun: boolean;
  skills: string[];
};

/** Logger interface used to keep updater output testable. */
export type Logger = {
  log(message: string): void;
  error(message: string): void;
};

/** Command runner interface used for git operations. */
export type Exec = (
  command: string,
  args: string[],
  cwd: string,
) => string;

/** Summary of a vendor update or check operation. */
export type UpdateResult = {
  changed: string[];
  checked: string[];
  ok: boolean;
};
