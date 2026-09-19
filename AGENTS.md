# AGENTS.md

Shared configuration and rules for AI coding agents (Claude Code, Codex, etc).
`mise run agent-config:install` symlinks configs into `~/.claude/`,
`~/.agents/`, `~/.codex/`.

## Commands

Run `mise tasks` for the full list with descriptions. Note that
`mise run thirdparty:add-skills` takes its source argument after `--`.

## Architecture

The Bun workspace separates the repository tooling by ownership:

- `packages/agent-config` owns config loading, installation, schema generation,
  and the compatibility CLI used by Mise tasks.
- `packages/agent-rules` owns global rule rendering and drift checks.
- `packages/agent-harness` owns repository checks and executable skill and
  plugin test discovery.
- `packages/agent-headless` owns the engine-neutral headless runner core:
  artifact directory, NDJSON stream handling, progress log, heartbeat, signal
  forwarding, and exit policy.
- `packages/claude-headless` owns the Claude-specific `claude-headless` bin
  (model routing, permission and setting flags, Claude stream events, delegation
  skill denial) and its integration test.
- `packages/codex-headless` owns the Codex-specific `codex-headless` bin
  (sandbox, model and effort config, resume and review modes, Codex stream
  events) and its integration test.
- `packages/agent-pr-monitor` owns read-only GitHub observation, deterministic
  change detection, durable cursors, and the `agent-pr-monitor` CLI. It observes
  a PR with one Octokit GraphQL query per poll; goal-aware evaluation adds
  active ruleset reads for required-check discovery. `evaluate` probes once and
  `wait --until` loops over the same evaluator without advancing the change
  cursor. Review completion and approval use submitted GitHub review metadata
  scoped to the selected reviewer and head. `gh` is only an authentication
  fallback. Its tests run in `test:unit`, with `test:pr-monitor` available for
  focused work. The headless runner core remains specific to model subprocesses.
- `packages/vendor-skills` owns reviewed third-party skill intake and updates.
- `packages/agent-judge` owns the `agent-judge evaluate` CLI for explicit
  TypeSafe requests and the bounded history reranking experiment. See its
  package README for request and artifact contracts. `mise run test:judge` tests
  it offline; those tests are also included in `test:unit`. Live calls require
  an exported `TYPESAFE_API_KEY` and are never part of ordinary verification.

`packages/agent-config` auto-discovers and symlinks skills:

- **Selected first-party skills**: `skills/*/` directories with a `SKILL.md`,
  subject to the selection rules below → `~/.claude/skills/` and
  `~/.agents/skills/`
- **Vendored third-party skills**: selected `thirdparty/skills/*/` directories
  with a `SKILL.md` → the same global skill targets

Managed Claude subagents can live under `claude/agents/` and are linked
individually into `~/.claude/agents/`, allowing unrelated local agents to
coexist. None are currently defined; the `staleSymlinkCleanup` entry for that
directory remains so previously installed links are removed.

Skill symlink entries accept `only`/`exclude` glob lists. Bounded analysis,
implementation, and review workers for both engines are installed into both
`~/.claude/skills/` and `~/.agents/skills/`. The `codex-first` and
`codex-computer-use` handoffs remain Claude-only; `claude-first` remains
Codex-only. `multi-agent-execution` contains Claude-specific routing and stays
Claude-only. `react-high-performance` and vendored `unslop` remain in source but
are excluded from installation. Base rules own the shared writing fundamentals.

The CLI worker skills use the corresponding headless runner for model routing,
streaming, sessions, and private artifacts. Both share `packages/agent-headless`
and the same layout: `events.ndjson`, `progress.log`, `result.md`, `run.json`,
and `stderr.log`. Worker prompts prohibit nested model delegation. Claude's
runner additionally denies native worker tools and both families of delegation
skills. This is not a shell-level prohibition on invoking model executables;
Codex workers rely on the prompt boundary rather than skill installation
filters.

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

`packages/agent-rules` renders global instructions from Markdown sources under
`rules/`. A source becomes a render target by declaring `type: agentic-rules`
and a `filename` in its frontmatter; the renderer discovers targets by scanning,
so adding one means creating a file rather than editing TypeScript. Sources
compose content with `<!-- include: path -->` directives, resolved relative to
the including file. Includes may nest, must stay inside `rules/`, and cycles are
rejected.

`rules/base.md` is shared by all targets and `rules/agents.md` by the non-Claude
ones; neither is a target itself. Run `mise run rules:build` after editing these
files; `mise run lint` checks the rendered files in `generated/` are current and
reports generated files no source claims. See `rules/README.md` for the layout.

## Testing

Plugin tests live in `plugins/*/tests/*.test.sh` and run with
`mise run test:plugins`. Tests must be self-contained bash scripts that exit 0
on success. TypeScript tests live beside package implementation files as
`packages/*/src/**/*.test.ts`; `mise run test` runs both unit and plugin tests.

Agent harness checks live in `packages/agent-harness` and run as part of
`mise run lint`. They verify that skill frontmatter names are slug-safe and
match their directories, vendored third-party skill locks match the checked-in
content, local plugin manifests remain valid, and each published plugin matches
its marketplace entry. Rendered global rule drift is checked by
`mise run rules:check`, which also runs as part of `mise run lint`.

Executable skill tests live under `skills/*/tests/`, use names matching
`*.test.*`, and run with `mise run test:skills`, which is included in
`mise run test`. The runner discovers nested tests, executes each file through
its shebang, continues after failures, and reports a combined result. Keep tests
self-contained, executable, and exit 0 on success.

The `claude-headless` and `codex-headless` integration tests live with their
packages and run through `mise run test:claude-headless` and
`mise run test:codex-headless`, both included in `mise run test`. Each drives
its bin against a fake CLI on `PATH` that replays recorded event shapes, so the
shared core is covered from both sides without a live model.

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

## Operational hazards and references

Do not run agent-config install from a delivery worktree. Test installer
behavior with a synthetic `--root`: a temporary HOME alone can still link Claude
settings to tracked files and let plugin setup write through that symlink.

Use [tooling notes](docs/agents/tooling-notes.md) for installer, headless CLI,
provider-specific, and vendor-intake quirks. Use the
[routing scenarios](docs/agents/routing-scenarios.md) when changing skill
selection or delegation rules.
