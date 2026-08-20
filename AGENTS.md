# AGENTS.md

Shared configuration and rules for AI coding agents (Claude Code, Codex, etc).
`mise run agent-config:install` symlinks configs into `~/.claude/`,
`~/.agents/`, `~/.codex/`.

## Commands

Run `mise tasks` for the full list with descriptions. Note that
`mise run thirdparty:add-skills` takes its source argument after `--`.

## Architecture

`packages/agent-config` auto-discovers and symlinks skills:

- **Ordinary first-party skills**: any `skills/*/` dir with a `SKILL.md` other
  than `codex-*` wrappers and directional `claude-*` skills →
  `~/.claude/skills/` and `~/.agents/skills/`
- **Vendored third-party skills**: any `thirdparty/skills/*/` dir with a
  `SKILL.md` → the same global skill targets

Managed Claude subagents can live under `claude/agents/` and are linked
individually into `~/.claude/agents/`, allowing unrelated local agents to
coexist. None are currently defined; the `staleSymlinkCleanup` entry for that
directory remains so previously installed links are removed.

Skill symlink entries accept `only`/`exclude` glob lists to scope which skills
an entry links. `codex-*` wrapper skills link only into `~/.claude/skills/` —
they are the handoff path from Claude to the Codex CLI. `claude-*` skills are
linked into `~/.agents/skills/` only, so Claude never loads skills that delegate
work back to itself.

To add a new skill, just create the directory — the installer picks it up
automatically. Stale symlinks are cleaned up on each run, including links that
an `only`/`exclude` change scoped out of a target root.

When creating or revising a repository-owned skill, use the environment's
skill-authoring workflow for packaging and platform mechanics. For instruction
design, routing, and scenario checks in skills or global rules, use
`skills/harness-engineering/references/agent-authoring.md`.

Third-party skills are source-controlled under `thirdparty/skills/`.
`thirdparty/skills.manifest.json` defines the reviewed upstream sources and
selected skills, while `thirdparty/skills.lock.json` records the resolved
commit, upstream path, and content hash. Skill entries can set `ref` to override
their source default. Agent config installation stays offline; run
`mise run thirdparty:add-skills -- <source>` to add and vendor skills, or
`mise run thirdparty:update-skills` explicitly to refresh already-configured
vendored content.

Legacy commands remain under `plugins/*/commands/`. Each plugin has a
`.claude-plugin/plugin.json` manifest and auto-discovered `.md` command files,
but all current plugin sources are deprecated and none are published.

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
`staleSymlinkCleanup[].targetDir`. Fixed symlinks may declare repo-relative
`relinkFrom` sources that the installer can replace without `--force`; an
undeclared mismatched link is preserved.

### Marketplace Manifest

`.claude-plugin/marketplace.json` at the repo root is retained as the local
marketplace manifest and currently publishes no plugins. Published entries use
metadata including name, version, description, source path, and category. Local
plugin manifests may remain unpublished.

### Global Rules

Global instructions are rendered from Markdown sources under `rules/`. A source
becomes a render target by declaring `type: agentic-rules` and a `filename` in
its frontmatter; the renderer discovers targets by scanning, so adding one means
creating a file rather than editing TypeScript. Sources compose content with
`<!-- include: path -->` directives, resolved relative to the including file.
Includes may nest, must stay inside `rules/`, and cycles are rejected.

`rules/base.md` is shared by all targets and `rules/agents.md` by the non-Claude
ones; neither is a target itself. Run `mise run rules:build` after editing these
files; `mise run lint` checks the rendered files in `generated/` are current and
reports generated files no source claims. See `rules/README.md` for the layout.

## Testing

Plugin tests live in `plugins/*/tests/*.test.sh` and run with
`mise run test:plugins`. Tests must be self-contained bash scripts that exit 0
on success. TypeScript tests live beside package implementation files as
`packages/*/src/**/*.test.ts`; `mise run test` runs both unit and plugin tests.

Agent harness checks live in `packages/agent-config` and run as part of
`mise run lint`. They verify that skill frontmatter names are slug-safe and
match their directories, vendored third-party skill locks match the checked-in
content, local plugin manifests remain valid, and each published plugin matches
its marketplace entry. Rendered global rule drift is checked by
`mise run rules:check`, which also runs as part of `mise run lint`.

Executable skill tests live in `skills/*/tests/*.test.sh` and run with
`mise run test:skills`, which is included in `mise run test`. Keep them
self-contained Bash scripts that exit 0 on success.

## Plugin Versioning

Plugins use semantic versioning. When changing a published plugin, bump its
version in **both** its manifest and marketplace entry:

1. `plugins/<name>/.claude-plugin/plugin.json`
2. `.claude-plugin/marketplace.json`

Unpublished plugin sources have no marketplace version to update.

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
runs `mise run setup` for new worktree bootstraps, including a full
initialization of the ignored `.codegraph/` index; validate it with
`mise run treeboot:check`.

The root `package.json` is a Bun workspace for packages under `packages/`.
`bunfig.toml` sets Bun's `install.minimumReleaseAge` to seven days. Keep it in
place so new direct and transitive npm dependency versions have had time to
settle before installation.

## Shell Conventions

2-space indent, `bash` variant, switch case indent, space redirects (`> file`
not `>file`). See `.editorconfig` for shfmt flags.

## Discoveries

- The external `skill-creator` `quick_validate.py` helper may lack an executable
  bit and requires `PyYAML`. Invoke it through `python3`; if that dependency is
  missing locally, rely on manual frontmatter checks plus `mise run lint` for
  repo-local skill edits.
- `codex/config.toml` supports the
  `#:schema https://developers.openai.com/codex/config-schema.json` header for
  editor autocomplete/validation in tools like VS Code or Cursor with Even
  Better TOML.
- Leave Codex's `git-commit-instructions` and `git-pr-instructions` unset. They
  customize app buttons that are not used here; the installed `commit` and
  `file-pr` skills own those workflows without mirrored config copies.
- When testing `agent-config install` with a temporary `HOME`, tools resolved
  through mise shims can fail trust checks. Prefer POSIX tools for setup helpers
  where possible, and validate symlink cleanup before plugin setup side effects.
- A temporary `HOME` does not isolate `agent-config install`. It links
  `~/.claude/settings.json` to the repo's `claude/settings.json`, then Claude
  plugin setup writes through that symlink — so the run mutates tracked repo
  files, including stamping `extraKnownMarketplaces` with the absolute path of
  whichever checkout it ran from. Exercise install behavior through
  `install.test.ts` with a synthetic `--root` instead; those tests never point
  at the real repo config.
- For gone-branch cleanup, `git branch -v` shows `[gone]` and `git branch -vv`
  adds the upstream ref. Prefer `git for-each-ref` for scripts that need stable
  gone-branch detection.
- Codex reads `~/.codex/AGENTS.md` only and never falls back to
  `~/.agents/AGENTS.md`; with no file at the former, it loads no global
  instructions at all. Verify what a session actually sees with
  `codex debug prompt-input`, which renders the model-visible prompt.
- Codex does not expand `@path` references — they reach the model as literal
  text. Content that must reach Codex has to be rendered inline.
- opencode reads `~/.config/opencode/AGENTS.md`, falling back to
  `~/.claude/CLAUDE.md` only when that file is absent. Populating the former
  stops opencode inheriting Claude-only rules.
- `thirdparty:add-skills` reports and skips unrelated upstream skills with
  malformed or non-slug metadata. Explicitly selecting an invalid skill still
  fails instead of vendoring metadata the local harness would reject.
