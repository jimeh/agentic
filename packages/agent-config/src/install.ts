import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { delimiter, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type SymlinkEntry = {
  source: string;
  target: string;
};

type SkillSymlinkConfig = {
  sourceRoot: string;
  targetRoots: string[];
};

type StaleSymlinkCleanupConfig = {
  sourceDir: string;
  targetDir: string;
};

type MarketplaceEntry = {
  name?: string;
  path?: string;
  repo?: string;
};

type PluginEntry = {
  id?: string;
};

type ClaudeMarketplace = {
  name: string;
  source: string;
};

type ClaudePlugin = {
  id: string;
};

type LocalClaudeMarketplace = {
  manifest: string;
  source: string;
  plugins: string[];
};

type AgentConfig = {
  symlinks: SymlinkEntry[];
  skillSymlinks: SkillSymlinkConfig[];
  staleSymlinkCleanup: StaleSymlinkCleanupConfig[];
  claude: {
    marketplaces: ClaudeMarketplace[];
    localMarketplace?: LocalClaudeMarketplace;
    plugins: ClaudePlugin[];
  };
};

type Options = {
  dryRun: boolean;
  force: boolean;
  root: string;
};

let rootDir = process.cwd();
const configFileNames = [
  "agent-config.toml",
  "agent-config.yaml",
  "agent-config.yml",
  "agent-config.json",
];

function info(message: string): void {
  console.error(` \x1b[36mINFO:\x1b[0m ${message}`);
}

function warn(message: string): void {
  console.error(` \x1b[33mWARN:\x1b[0m ${message}`);
}

function logError(message: string): void {
  console.error(`\x1b[31mERROR:\x1b[0m ${message}`);
}

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agent-config install [options]",
      "",
      "Options:",
      "  --root     Repository root (default: current directory)",
      "  --dry-run  Preview what would be done without making changes",
      "  --force    Replace existing files/symlinks (backs up to .bak, .bak2, …)",
      "",
      "Creates symlinks for Claude Code and agents configuration:",
      "",
      "  Fixed symlinks, skill roots, cleanup paths, Claude marketplaces,",
      "  and Claude plugins are configured in agent-config.toml.",
      "  JSON and YAML config files are also supported.",
      "",
      "Registers configured plugin marketplaces and installs plugins",
      "via the Claude CLI, including the OpenAI Codex plugin",
      "(skipped if claude is not available).",
      "",
      "Also removes stale skill symlinks (and legacy command symlinks).",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseArgs(args: string[]): Options {
  const options = { dryRun: false, force: false, root: process.cwd() };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true;
    } else if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--root") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        usage();
      }
      options.root = value;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      logError(`Unknown argument: ${arg}`);
      console.error("");
      usage();
    }
  }

  return options;
}

function homePath(path: string): string {
  if (!path.startsWith("~/")) {
    throw new Error(`${path}: expected home-relative path starting with ~/`);
  }

  const home = process.env.HOME;
  if (!home) {
    throw new Error("HOME is not set");
  }

  return join(home, path.slice(2));
}

function rootPath(path: string): string {
  return path === "." ? rootDir : join(rootDir, path);
}

function assertObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path}: expected object`);
  }

  return value as Record<string, unknown>;
}

function assertString(value: unknown, path: string): string {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${path}: expected non-empty string`);
  }

  return value;
}

function assertStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path}: expected array`);
  }

  return value.map((entry, index) => assertString(entry, `${path}[${index}]`));
}

function assertHomePath(value: unknown, path: string): string {
  const homePathValue = assertString(value, path);
  if (!homePathValue.startsWith("~/")) {
    throw new Error(`${path}: expected home-relative path starting with ~/`);
  }

  return homePathValue;
}

function assertHomePathArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path}: expected array`);
  }

  return value.map((entry, index) =>
    assertHomePath(entry, `${path}[${index}]`),
  );
}

function assertArray<T>(
  value: unknown,
  path: string,
  mapper: (entry: unknown, path: string) => T,
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path}: expected array`);
  }

  return value.map((entry, index) => mapper(entry, `${path}[${index}]`));
}

function findConfigPath(): string {
  for (const name of configFileNames) {
    const path = join(rootDir, name);
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error(`missing agent config file (${configFileNames.join(", ")})`);
}

function parseConfigFile(path: string): unknown {
  const input = readFileSync(path, "utf8");
  const extension = extname(path);

  if (extension === ".json") {
    return JSON.parse(input);
  }

  if (extension === ".toml") {
    return Bun.TOML.parse(input);
  }

  if (extension === ".yaml" || extension === ".yml") {
    return Bun.YAML.parse(input);
  }

  throw new Error(`${path}: unsupported config format`);
}

function readConfig(): AgentConfig {
  const configPath = findConfigPath();
  const raw = assertObject(parseConfigFile(configPath), "$");
  const claude = assertObject(raw.claude, "$.claude");

  return {
    symlinks: assertArray(raw.symlinks, "$.symlinks", (entry, path) => {
      const object = assertObject(entry, path);
      return {
        source: assertString(object.source, `${path}.source`),
        target: assertHomePath(object.target, `${path}.target`),
      };
    }),
    skillSymlinks: assertArray(
      raw.skillSymlinks,
      "$.skillSymlinks",
      (entry, path) => {
        const object = assertObject(entry, path);
        return {
          sourceRoot: assertString(object.sourceRoot, `${path}.sourceRoot`),
          targetRoots: assertHomePathArray(
            object.targetRoots,
            `${path}.targetRoots`,
          ),
        };
      },
    ),
    staleSymlinkCleanup: assertArray(
      raw.staleSymlinkCleanup,
      "$.staleSymlinkCleanup",
      (entry, path) => {
        const object = assertObject(entry, path);
        return {
          sourceDir: assertString(object.sourceDir, `${path}.sourceDir`),
          targetDir: assertHomePath(object.targetDir, `${path}.targetDir`),
        };
      },
    ),
    claude: {
      marketplaces: assertArray(
        claude.marketplaces,
        "$.claude.marketplaces",
        (entry, path) => {
          const object = assertObject(entry, path);
          return {
            name: assertString(object.name, `${path}.name`),
            source: assertString(object.source, `${path}.source`),
          };
        },
      ),
      localMarketplace: readLocalMarketplace(claude.localMarketplace),
      plugins: assertArray(
        claude.plugins,
        "$.claude.plugins",
        (entry, path) => {
          const object = assertObject(entry, path);
          return {
            id: assertString(object.id, `${path}.id`),
          };
        },
      ),
    },
  };
}

function readLocalMarketplace(
  value: unknown,
): LocalClaudeMarketplace | undefined {
  if (value === undefined) {
    return undefined;
  }

  const object = assertObject(value, "$.claude.localMarketplace");
  return {
    manifest: assertString(
      object.manifest,
      "$.claude.localMarketplace.manifest",
    ),
    source: assertString(object.source, "$.claude.localMarketplace.source"),
    plugins: assertStringArray(
      object.plugins,
      "$.claude.localMarketplace.plugins",
    ),
  };
}

function discoverSymlinks(config: AgentConfig): SymlinkEntry[] {
  return [
    ...config.symlinks.map((entry) => ({
      source: entry.source,
      target: homePath(entry.target),
    })),
    ...config.skillSymlinks.flatMap((entry) => discoverSkillSymlinks(entry)),
  ];
}

function discoverSkillSymlinks(config: SkillSymlinkConfig): SymlinkEntry[] {
  const absoluteRoot = join(rootDir, config.sourceRoot);
  if (!existsSync(absoluteRoot)) {
    return [];
  }

  return readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) {
      return [];
    }

    const skillPath = join(absoluteRoot, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) {
      return [];
    }

    return config.targetRoots.map((targetRoot) => ({
      source: `${config.sourceRoot}/${entry.name}`,
      target: homePath(`${targetRoot}/${entry.name}`),
    }));
  });
}

function existsOrSymlink(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(path: string): string {
  return resolve(path);
}

function resolveSymlink(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

function symlinkTargetPath(link: string): string {
  const target = readlinkSync(link);
  return normalizePath(
    target.startsWith("/") ? target : join(dirname(link), target),
  );
}

function symlinkType(source: string): "dir" | "file" {
  try {
    return lstatSync(source).isDirectory() ? "dir" : "file";
  } catch {
    return "file";
  }
}

function createSymlink(source: string, target: string): void {
  symlinkSync(source, target, symlinkType(source));
}

function backupPath(target: string): string {
  let candidate = `${target}.bak`;
  for (let i = 2; existsOrSymlink(candidate); i += 1) {
    candidate = `${target}.bak${i}`;
  }
  return candidate;
}

function backupAndLink(source: string, target: string, options: Options): void {
  if (!options.dryRun) {
    mkdirSync(dirname(target), { recursive: true });
  }

  if (existsOrSymlink(target)) {
    if (lstatSync(target).isSymbolicLink()) {
      const linkTarget = symlinkTargetPath(target);
      const legacyRules = normalizePath(join(rootDir, "RULES.md"));

      if (linkTarget === legacyRules) {
        if (options.dryRun) {
          info(`would relink legacy ${target} → ${source}`);
        } else {
          info(`relink legacy ${target} → ${source}`);
          rmSync(target, { force: true });
          createSymlink(source, target);
        }
        return;
      }

      const realTarget = resolveSymlink(target);
      const realSource = resolveSymlink(source);
      if (realTarget && realSource && realTarget === realSource) {
        info(`skip ${target} (already linked)`);
        return;
      }
    }

    if (options.force) {
      const backup = backupPath(target);
      if (options.dryRun) {
        info(`would backup ${target} → ${backup}`);
      } else {
        info(`backup ${target} → ${backup}`);
        renameSync(target, backup);
      }
    } else {
      warn(`skip ${target} (already exists, use --force)`);
      return;
    }
  }

  if (options.dryRun) {
    info(`would link ${source} → ${target}`);
  } else {
    info(`link ${source} → ${target}`);
    createSymlink(source, target);
  }
}

function createSymlinks(entries: SymlinkEntry[], options: Options): void {
  for (const entry of entries) {
    backupAndLink(join(rootDir, entry.source), entry.target, options);
  }
}

function cleanupStaleLinks(
  sourceDir: string,
  targetDir: string,
  options: Options,
): void {
  if (!existsSync(targetDir)) {
    return;
  }

  const realSourceDir = normalizePath(sourceDir);

  for (const entry of readdirSync(targetDir, { withFileTypes: true })) {
    const link = join(targetDir, entry.name);
    if (!entry.isSymbolicLink()) {
      continue;
    }

    const realTarget = symlinkTargetPath(link);
    if (realTarget.startsWith(`${realSourceDir}/`) && !existsSync(realTarget)) {
      if (options.dryRun) {
        info(`would remove stale: ${link}`);
      } else {
        info(`remove stale: ${link}`);
        rmSync(link, { force: true });
      }
    }
  }
}

function cleanupStale(
  entries: StaleSymlinkCleanupConfig[],
  options: Options,
): void {
  for (const entry of entries) {
    cleanupStaleLinks(
      rootPath(entry.sourceDir),
      homePath(entry.targetDir),
      options,
    );
  }
}

function commandExists(command: string): boolean {
  if (command.includes("/")) {
    return isExecutable(command);
  }

  return (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .some((dir) => isExecutable(join(dir, command)));
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function runJson<T>(command: string, args: string[]): T[] {
  const label = `${command} ${args.join(" ")}`;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr.trim()}`);
  }

  try {
    return JSON.parse(result.stdout) as T[];
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function runCommand(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function ensureMarketplace(
  marketplaces: MarketplaceEntry[],
  name: string,
  source: string,
  options: Options,
): MarketplaceEntry[] {
  const match = marketplaces.find((marketplace) => marketplace.name === name);
  if (match) {
    const actual = match.path ?? match.repo;
    if (actual && actual !== source) {
      warn(`marketplace ${name} points to ${actual} (expected ${source})`);
    }
    info(`skip marketplace ${name} (already configured)`);
    return marketplaces;
  }

  if (options.dryRun) {
    info(`would add marketplace ${name}`);
    return marketplaces;
  }

  info(`add marketplace ${name}`);
  runCommand("claude", ["plugin", "marketplace", "add", source]);
  return runJson<MarketplaceEntry>("claude", [
    "plugin",
    "marketplace",
    "list",
    "--json",
  ]);
}

function ensurePlugin(
  plugins: PluginEntry[],
  pluginId: string,
  options: Options,
): PluginEntry[] {
  if (plugins.some((plugin) => plugin.id === pluginId)) {
    info(`skip plugin ${pluginId} (already installed)`);
    return plugins;
  }

  if (options.dryRun) {
    info(`would install plugin ${pluginId}`);
    return plugins;
  }

  info(`install plugin ${pluginId}`);
  runCommand("claude", ["plugin", "install", pluginId]);
  return runJson<PluginEntry>("claude", ["plugin", "list", "--json"]);
}

function localMarketplace(config: LocalClaudeMarketplace): string | null {
  const manifest = rootPath(config.manifest);
  if (!existsSync(manifest)) {
    warn("marketplace manifest not found, skipping local plugin setup");
    return null;
  }

  const marketplace = JSON.parse(readFileSync(manifest, "utf8"))?.name;
  if (typeof marketplace !== "string" || marketplace === "") {
    warn("marketplace name not found in manifest, skipping local plugins");
    return null;
  }

  return marketplace;
}

function setupClaudePlugins(
  config: AgentConfig["claude"],
  options: Options,
): void {
  if (!commandExists("claude")) {
    info("claude CLI not found, skipping plugin setup");
    return;
  }

  const marketplace = config.localMarketplace
    ? localMarketplace(config.localMarketplace)
    : null;

  let marketplaces = runJson<MarketplaceEntry>("claude", [
    "plugin",
    "marketplace",
    "list",
    "--json",
  ]);
  for (const entry of config.marketplaces) {
    marketplaces = ensureMarketplace(
      marketplaces,
      entry.name,
      entry.source,
      options,
    );
  }
  if (marketplace) {
    marketplaces = ensureMarketplace(
      marketplaces,
      marketplace,
      rootPath(config.localMarketplace?.source ?? "."),
      options,
    );
  }

  let plugins = runJson<PluginEntry>("claude", ["plugin", "list", "--json"]);
  for (const plugin of config.plugins) {
    plugins = ensurePlugin(plugins, plugin.id, options);
  }
  if (marketplace && config.localMarketplace) {
    for (const plugin of config.localMarketplace.plugins) {
      plugins = ensurePlugin(plugins, `${plugin}@${marketplace}`, options);
    }
  }
}

export function installAgentConfig(args: string[]): number {
  try {
    const options = parseArgs(args);
    rootDir = resolve(options.root);
    const config = readConfig();
    if (options.dryRun) {
      info("Dry run mode (no changes will be made)");
    }

    info("Setting up symlinks...");
    createSymlinks(discoverSymlinks(config), options);
    cleanupStale(config.staleSymlinkCleanup, options);

    info("Setting up Claude plugins...");
    setupClaudePlugins(config.claude, options);

    info("Done!");
    return 0;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    logError(message);
    return 1;
  }
}
