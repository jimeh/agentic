#!/usr/bin/env bun

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
import { delimiter, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

type SymlinkEntry = {
  source: string;
  target: string;
};

type MarketplaceEntry = {
  name?: string;
  path?: string;
};

type PluginEntry = {
  id?: string;
};

type Options = {
  dryRun: boolean;
  force: boolean;
};

const rootDir = resolve(import.meta.dir, "..");
const claudePlugins = ["strip-git-cwd", "git-commands", "agents-md"];

function info(message: string): void {
  console.error(` \x1b[36mINFO:\x1b[0m ${message}`);
}

function warn(message: string): void {
  console.error(` \x1b[33mWARN:\x1b[0m ${message}`);
}

function error(message: string): void {
  console.error(`\x1b[31mERROR:\x1b[0m ${message}`);
}

function usage(exitCode = 2): never {
  console.log(
    [
      "Usage: mise run agent-config:install -- [--dry-run] [--force] [--help]",
      "",
      "Options:",
      "  --dry-run  Preview what would be done without making changes",
      "  --force    Replace existing files/symlinks (backs up to .bak)",
      "",
      "Creates symlinks for Claude Code and agents configuration:",
      "",
      "  generated/CLAUDE.md → ~/.claude/CLAUDE.md",
      "  generated/AGENTS.md → ~/.agents/AGENTS.md",
      "  generated/AGENTS.md → ~/.codex/AGENTS.md",
      "  claude/settings      → ~/.claude/settings.json",
      "  claude/statusline    → ~/.claude/statusline.sh",
      "  codex/config.toml    → ~/.codex/config.toml",
      "  codex/hooks.json     → ~/.codex/hooks.json",
      "  skills/*             → ~/.claude/skills/",
      "  skills/*             → ~/.agents/skills/",
      "  thirdparty/skills/*  → ~/.claude/skills/",
      "  thirdparty/skills/*  → ~/.agents/skills/",
      "",
      "Registers the local plugin marketplace and installs plugins",
      "via the Claude CLI (skipped if claude is not available).",
      "",
      "Also removes stale skill symlinks (and legacy command symlinks).",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseArgs(args: string[]): Options {
  const options = { dryRun: false, force: false };

  for (const arg of args) {
    if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true;
    } else if (arg === "--force" || arg === "-f") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      error(`Unknown argument: ${arg}`);
      console.error("");
      usage();
    }
  }

  return options;
}

function homePath(path: string): string {
  return join(process.env.HOME ?? "", path);
}

function discoverSymlinks(): SymlinkEntry[] {
  return [
    {
      source: "generated/CLAUDE.md",
      target: homePath(".claude/CLAUDE.md"),
    },
    {
      source: "generated/AGENTS.md",
      target: homePath(".agents/AGENTS.md"),
    },
    {
      source: "generated/AGENTS.md",
      target: homePath(".codex/AGENTS.md"),
    },
    {
      source: "claude/settings.json",
      target: homePath(".claude/settings.json"),
    },
    {
      source: "claude/keybindings.json",
      target: homePath(".claude/keybindings.json"),
    },
    {
      source: "claude/statusline.sh",
      target: homePath(".claude/statusline.sh"),
    },
    {
      source: "codex/config.toml",
      target: homePath(".codex/config.toml"),
    },
    {
      source: "codex/hooks.json",
      target: homePath(".codex/hooks.json"),
    },
    {
      source: "codex/pets",
      target: homePath(".codex/pets"),
    },
    ...discoverSkillSymlinks("skills"),
    ...discoverSkillSymlinks("thirdparty/skills"),
  ];
}

function discoverSkillSymlinks(root: string): SymlinkEntry[] {
  const absoluteRoot = join(rootDir, root);
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

    return [
      {
        source: `${root}/${entry.name}`,
        target: homePath(`.claude/skills/${entry.name}`),
      },
      {
        source: `${root}/${entry.name}`,
        target: homePath(`.agents/skills/${entry.name}`),
      },
    ];
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
      if (options.dryRun) {
        info(`would backup ${target} → ${target}.bak`);
      } else {
        info(`backup ${target} → ${target}.bak`);
        renameSync(target, `${target}.bak`);
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

function cleanupStale(options: Options): void {
  cleanupStaleLinks(
    join(rootDir, "claude", "commands"),
    homePath(".claude/commands"),
    options,
  );
  cleanupStaleLinks(
    join(rootDir, "skills"),
    homePath(".claude/skills"),
    options,
  );
  cleanupStaleLinks(
    join(rootDir, "skills"),
    homePath(".agents/skills"),
    options,
  );
  cleanupStaleLinks(
    join(rootDir, "thirdparty", "skills"),
    homePath(".claude/skills"),
    options,
  );
  cleanupStaleLinks(
    join(rootDir, "thirdparty", "skills"),
    homePath(".agents/skills"),
    options,
  );
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
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0 || result.stdout.trim() === "") {
    return [];
  }

  try {
    return JSON.parse(result.stdout) as T[];
  } catch {
    return [];
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
    if (match.path && match.path !== source) {
      warn(`marketplace ${name} points to ${match.path} (expected ${source})`);
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

function setupClaudePlugins(options: Options): void {
  if (!commandExists("claude")) {
    info("claude CLI not found, skipping plugin setup");
    return;
  }

  const manifest = join(rootDir, ".claude-plugin", "marketplace.json");
  if (!existsSync(manifest)) {
    warn("marketplace manifest not found, skipping plugin setup");
    return;
  }

  const marketplace = JSON.parse(readFileSync(manifest, "utf8"))?.name;
  if (typeof marketplace !== "string" || marketplace === "") {
    warn("marketplace name not found in manifest, skipping");
    return;
  }

  let marketplaces = runJson<MarketplaceEntry>("claude", [
    "plugin",
    "marketplace",
    "list",
    "--json",
  ]);
  marketplaces = ensureMarketplace(
    marketplaces,
    "claude-plugins-official",
    "anthropics/claude-plugins-official",
    options,
  );
  marketplaces = ensureMarketplace(marketplaces, marketplace, rootDir, options);

  let plugins = runJson<PluginEntry>("claude", ["plugin", "list", "--json"]);
  for (const plugin of claudePlugins) {
    plugins = ensurePlugin(plugins, `${plugin}@${marketplace}`, options);
  }
}

function main(args: string[]): number {
  try {
    const options = parseArgs(args);
    if (options.dryRun) {
      info("Dry run mode (no changes will be made)");
    }

    info("Setting up symlinks...");
    createSymlinks(discoverSymlinks(), options);
    cleanupStale(options);

    info("Setting up Claude plugins...");
    setupClaudePlugins(options);

    info("Done!");
    return 0;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    error(message);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
