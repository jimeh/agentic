# AGENTS.md

Shared configuration and rules for AI coding agents (Claude Code, Codex, etc).
`mise run agent-config:install` symlinks configs into `~/.claude/`,
`~/.agents/`, `~/.codex/`.

## Commands

```bash
mise run deps:install             # install npm deps with minimum release age
```

```bash
mise run setup                    # install deps and local git hooks
mise run setup:ci                 # install CI deps from lockfile
mise run deps:install             # install project dependencies
mise run deps:install:ci          # install deps from lockfile for CI
mise run agent-config:install     # install agent config symlinks/plugins
mise run agent-config:force       # replace installed agent config symlinks
mise run agent-config:dry-run     # preview agent config installation
mise run agent-config:schema:build # generate agent config JSON schema
mise run agent-config:schema:check # check agent config schema is current
mise run hooks:install            # install Lefthook git hooks
mise run thirdparty:add-skills -- <source> # add upstream skills to manifest
mise run thirdparty:update-skills         # update vendored third-party skills
mise run thirdparty:update-skills:dry-run # preview third-party skill updates
mise run thirdparty:update-skills:check   # check vendored skills upstream
mise run rules:build        # render global AGENTS.md/CLAUDE.md files
mise run rules:check        # check rendered global rules are up to date
mise run actions:update     # update and pin GitHub Actions with Pinact
mise run treeboot           # bootstrap a new worktree
mise run treeboot:check     # validate Treeboot bootstrap config
mise run format              # format Markdown/TypeScript
mise run format:check        # check file formatting
mise run lint                # run lint and agent metadata checks
mise run check               # run format check, lint, and typecheck
mise run test                # run Bun and plugin tests
mise run test:unit           # run Bun tests
mise run test:plugins        # run plugin shell tests
mise run verify              # run lint and tests
mise run typecheck           # type-check TypeScript
mise run format:oxfmt        # format files with oxfmt
mise run format:oxfmt:check  # check oxfmt formatting
mise run lint:oxlint         # lint TypeScript with oxlint
mise run lint:markdownlint   # lint with markdownlint only
mise run lint:shell          # lint shell scripts with shellcheck
mise run lint:agent-harness  # check skill/plugin metadata invariants
mise run lint:workflows      # check GitHub Actions syntax/security
```

## Architecture

`packages/agent-config` auto-discovers and symlinks skills:

- **Ordinary first-party skills**: any `skills/*/` dir with a `SKILL.md` other
  than directional `codex-*` and `claude-*` skills → `~/.claude/skills/` and
  `~/.agents/skills/`
- **Vendored third-party skills**: any `thirdparty/skills/*/` dir with a
  `SKILL.md` → the same global skill targets

Skill symlink entries accept `only`/`exclude` glob lists to scope which skills
an entry links. `codex-*` skills are linked into `~/.claude/skills/` only, and
`claude-*` skills into `~/.agents/skills/` only, so neither executor loads the
skills that delegate work to it.

To add a new skill, just create the directory — the installer picks it up
automatically. Stale symlinks are cleaned up on each run, including links that
an `only`/`exclude` change scoped out of a target root.

Third-party skills are source-controlled under `thirdparty/skills/`.
`thirdparty/skills.manifest.json` defines the reviewed upstream sources and
selected skills, while `thirdparty/skills.lock.json` records the resolved
commit, upstream path, and content hash. Skill entries can set `ref` to override
their source default. Agent config installation stays offline; run
`mise run thirdparty:add-skills -- <source>` to add and vendor skills, or
`mise run thirdparty:update-skills` explicitly to refresh already-configured
vendored content.

**Commands** live in plugins under `plugins/*/commands/`. Each plugin has a
`.claude-plugin/plugin.json` manifest and auto-discovered `.md` command files.

**Plugins** are installed via the Claude CLI, not symlinks. The
`agent-config install` command reads `agent-config.toml` to register Claude
plugin marketplaces and install configured Claude plugins. Requires the `claude`
CLI. The package also supports `agent-config.yaml`, `agent-config.yml`, and
`agent-config.json`, after checking `agent-config.toml` first.

`agent-config.toml` points editors at `schemas/agent-config.schema.json` with a
schema comment. The schema file is generated from `packages/agent-config`; run
`mise run agent-config:schema:build` after schema changes. `mise run lint`
checks it is current via `mise run agent-config:schema:check`.

In `agent-config.toml`, source paths are repo-relative. Home-side target paths
must start with `~/`: `symlinks[].target`, `skillSymlinks[].targetRoots[]`, and
`staleSymlinkCleanup[].targetDir`.

### Marketplace Manifest

`.claude-plugin/marketplace.json` at the repo root lists all publishable plugins
with metadata (name, version, description, source path, category).

### Global Rules

Global instructions are rendered from Markdown sources under `rules/`.
`rules/base.md` is shared by all targets, and `rules/agents.md` or
`rules/claude.md` can append target-specific guidance. Run
`mise run rules:build` after editing these files; `mise run lint` checks the
rendered files in `generated/` are current.

### Agent-Specific Config

- `claude/` — Claude Code settings, statusline script
- `codex/` — OpenAI Codex config (TOML)

## Testing

Plugin tests live in `plugins/*/tests/*.test.sh` and run with
`mise run test:plugins`. Tests must be self-contained bash scripts that exit 0
on success. TypeScript tests live beside package implementation files as
`packages/*/src/**/*.test.ts`; `mise run test` runs both unit and plugin tests.

Agent harness checks live in `packages/agent-config` and run as part of
`mise run lint`. They verify that skill frontmatter names are slug-safe and
match their directories, vendored third-party skill locks match the checked-in
content, and Claude plugin versions match the marketplace. They also keep the
PR-copy hygiene rules aligned across the authoritative `commit-push-pr` skill,
the related PR-copy skill and Claude command, and the embedded Codex PR
instructions. Rendered global rule drift is checked by `mise run rules:check`,
which also runs as part of `mise run lint`.

## Plugin Versioning

Plugins use semantic versioning (MAJOR.MINOR.PATCH). When committing changes to
a plugin, bump the version based on the change type:

- **patch** (0.1.0 → 0.1.1): bug fixes, wording tweaks, minor adjustments
- **minor** (0.1.1 → 0.2.0): new commands, new features, non-breaking changes
- **major** (0.2.0 → 1.0.0): breaking changes (renamed commands, removed
  functionality, changed behavior)

Update the version in **both** files:

1. `plugins/<name>/.claude-plugin/plugin.json`
2. `.claude-plugin/marketplace.json`

## Before Committing

Check if `README.md` or this `AGENTS.md` file need updates to reflect your
changes (new commands, skills, structural changes, conventions, etc.).

## phased-work Plugin

When changing any command in `plugins/phased-work/commands/`, always update the
corresponding snippet in `plugins/phased-work/snippets.md` to stay aligned in
spirit. Snippets are intentionally shorter than commands (no frontmatter, no
tool constraints, no context blocks), but the core instructional intent should
match.

## Formatting

oxfmt (`proseWrap: "always"`, 80 chars) handles repo formatting; markdownlint
handles Markdown-specific linting. `embeddedLanguageFormatting: "off"` keeps
oxfmt from touching YAML frontmatter. Run `mise run format` before committing.
Lefthook uses staged file globs as triggers, then runs repo-level
`mise run format:oxfmt:check`, `mise run lint:markdownlint`, and
`mise run lint:oxlint` before commit. Formatting/lint exclusions live in
`.oxfmtrc.json` and `.markdownlint-cli2.jsonc`. Vendored content under
`thirdparty/` is excluded from Markdown formatting/linting;
`mise run lint:agent-harness` checks vendored skill frontmatter and content
hashes instead.

## Dependency Policy

`mise.toml` pins Bun to the `1.3` release line and keeps other Mise-managed
tools on their current major release lines, resolved through `mise.lock`. Mise's
repo-local `minimum_release_age` is three days, and `task.run_auto_install` is
enabled so task tools install automatically. Run
`mise lock --minimum-release-age 3d` after changing Mise tools. `.pinact.yaml`
sets Pinact's GitHub Actions minimum release age to three days; use
`mise run actions:update` to update pinned workflow actions. `.treeboot.toml`
runs `mise run setup` for new worktree bootstraps; validate it with
`mise run treeboot:check`.

The root `package.json` is a Bun workspace for packages under `packages/`.
`bunfig.toml` sets Bun's `install.minimumReleaseAge` to seven days. Keep it in
place so new direct and transitive npm dependency versions have had time to
settle before installation.

## Shell Conventions

2-space indent, `bash` variant, switch case indent, space redirects (`> file`
not `>file`). See `.editorconfig` for shfmt flags.

## Discoveries

- The external `skill-creator` `quick_validate.py` helper requires `PyYAML`. If
  that dependency is missing locally, rely on manual frontmatter checks plus
  `mise run lint` for repo-local skill edits.
- `codex/config.toml` supports the
  `#:schema https://developers.openai.com/codex/config-schema.json` header for
  editor autocomplete/validation in tools like VS Code or Cursor with Even
  Better TOML.
- When testing `agent-config install` with a temporary `HOME`, tools resolved
  through mise shims can fail trust checks. Prefer POSIX tools for setup helpers
  where possible, and validate symlink cleanup before plugin setup side effects.
- For gone-branch cleanup, `git branch -v` shows `[gone]` and `git branch -vv`
  adds the upstream ref. Prefer `git for-each-ref` for scripts that need stable
  gone-branch detection.
