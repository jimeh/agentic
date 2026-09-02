<div align="center">

# agentic

</div>

My personal AI coding agent configuration, with any quirks, oddities,
opinionated rules, and hallucination-inducing prompt fragments I live with on a
daily basis.

One repo, one base rule set, rendered into per-agent global instruction files.
Supports [Claude Code], [Codex], and any tool that reads `AGENTS.md`.

> [!Warning]
>
> This is my personal config. It is not a starter kit, a framework, or a
> best-practices guide. If you use it as-is, things will probably work — but
> they'll work _my_ way, which may not be _your_ way. Browse for ideas, steal
> what's useful, but don't say I didn't warn you.

[Claude Code]: https://docs.anthropic.com/en/docs/claude-code
[Codex]: https://github.com/openai/codex

## Quick Start

```bash
git clone https://github.com/jimeh/agentic.git ~/.config/agentic
cd ~/.config/agentic
mise run setup                  # install dependencies and local git hooks
mise run agent-config:install   # create symlinks (skips existing)
# mise run agent-config:force   # replace existing (backs up to .bak)
```

This creates symlinks from the repo into `~/.claude/`, `~/.agents/`, and
`~/.codex/`, and registers configured plugin marketplaces via the Claude CLI.
Use the `mise run agent-config:*` tasks for installation.

Install only project dependencies with:

```bash
mise run deps:install
```

Git hooks are managed by Lefthook and installed by `mise run setup`. To install
or refresh hooks directly:

```bash
mise run hooks:install
```

## What's Inside

- **`rules/`** — Source Markdown for global behavior rules. Each render target
  declares itself with `type: agentic-rules` frontmatter and composes its
  content with `<!-- include: path -->` directives. See `rules/README.md`.
- **`generated/`** — Rendered global rule files (`CLAUDE.md`, `CODEX.md`,
  `OPENCODE.md`). These are symlinked into agent config directories; edit
  `rules/` and run `mise run rules:build` instead of editing generated files
  directly.
- **`agent-config.toml`** — Installer config for fixed symlinks, skill symlink
  roots, stale-link cleanup paths, Claude plugin marketplaces, and
  auto-installed Claude plugins. It points editors at
  `schemas/agent-config.schema.json`; JSON and YAML config files are also
  supported.
- **`claude/`** — Claude Code settings and statusline script.
- **`codex/`** — OpenAI Codex config.
- **`skills/`** — Custom skills (auto-discovered by the agent config installer).
- **`thirdparty/`** — Vendored third-party skills plus manifest and lock
  metadata.
- **`plugins/`** — Source retained for deprecated Claude Code plugins.
- **`packages/agent-config/`** — Config installer, schema generator, and the
  compatibility CLI used by Mise tasks.
- **`packages/agent-rules/`** — Global rule renderer and drift checker.
- **`packages/agent-harness/`** — Agent metadata checks and executable skill and
  plugin test runner.
- **`packages/agent-headless/`** — Shared core for the streamed headless CLI
  runners: artifacts, stream handling, progress, and exit policy.
- **`packages/claude-headless/`** — Streamed Claude CLI runner with private run
  artifacts and package-owned integration tests.
- **`packages/codex-headless/`** — Streamed Codex CLI runner with the same
  artifact layout, sandbox and session handling, and integration tests.
- **`packages/vendor-skills/`** — Reviewed third-party skill intake and update
  tooling.
- **`docs/references/`** — External articles and guides.

Skills are auto-discovered — drop a directory in the right place, re-run the
agent config installer, done. Vendored third-party skills under
`thirdparty/skills/` are installed the same way, but only the explicit update
task fetches from upstream. No plugins are currently published through the local
Claude marketplace; the remaining plugin sources are retained but deprecated.

Update vendored third-party skills with:

```bash
mise run thirdparty:add-skills -- vercel-labs/agent-skills
mise run thirdparty:add-skills -- vercel-labs/agent-skills --skill skill-name
mise run thirdparty:update-skills
mise run thirdparty:update-skills:dry-run
mise run thirdparty:update-skills:check
```

Those tasks call the repo-local `vendor-skills` CLI through Bun. Its
implementation and colocated tests live under `packages/vendor-skills/src/`. The
add command accepts full git URLs or GitHub `owner/repo` shorthand and opens a
multi-select prompt when `--skill` is not provided, then vendors selected skills
and updates the lockfile. `--skill` matches a skill's frontmatter name or its
upstream directory name. Individual manifest skill entries can set `ref` to pin
or test a skill separately from the source default.

Render global instruction files after changing `rules/`:

```bash
mise run rules:build
mise run rules:check
```

Update pinned GitHub Actions with Pinact:

```bash
mise run actions:update
```

New worktrees can be bootstrapped with Treeboot:

```bash
mise run treeboot
mise run treeboot:check
```

Run local tests with:

```bash
mise run test
mise run test:plugins
mise run test:skills
mise run test:claude-headless
mise run test:codex-headless
```

Format Markdown and TypeScript with:

```bash
mise run format
mise run format:check
```

Mise-managed tools are locked in `mise.lock`. Bun stays on the `1.3` release
line; other tools stay on their current major release lines with Mise's
three-day `minimum_release_age`. Refresh tool lock metadata after changing
`mise.toml` with:

```bash
mise lock --minimum-release-age 3d
```

## Plugins

No plugins are currently supported or published by this repository. Sources
under `plugins/` are deprecated and retained for reference; they are not
available from the marketplace.

### Deprecated: [strip-git-cwd](plugins/strip-git-cwd/)

A `PreToolUse` hook that strips redundant `git -C <cwd>` flags from Bash
commands when the path matches the current working directory. Claude Code tends
to add these unnecessarily, and the `-C` flag changes the command string enough
that pre-approved git commands no longer match the allowlist — causing repeated
permission prompts.

Handles all `-C` syntax variants (space, `=`, bare, quoted) and compound
commands (`&&`, `;`).

### Deprecated: [git-commands](plugins/git-commands/)

Slash commands for common git workflows:

- `/commit` — Stage changes, create a well-formed commit.
- `/commit-push-pr` — Commit, push, and open a PR.
- `/rebase` — Rebase onto upstream main/master.
- `/clean-gone-branches` — Clean up branches deleted on remote.

Derived from the official `commit-commands` plugin, heavily modified.

### Deprecated: [agents-md](plugins/agents-md/)

Slash commands for managing AGENTS.md files:

- `/claude-md-to-agents-md` — Convert CLAUDE.md to AGENTS.md.
- `/generate-agents-md` — Generate AGENTS.md from codebase analysis.
- `/refactor-agents-md` — Refactor AGENTS.md for progressive disclosure.

### Deprecated: [phased-work](plugins/phased-work/)

A disciplined research-plan-implement workflow. Instead of jumping straight to
code, you move through distinct phases so every decision is reviewed before
implementation begins.

- `/research` — Deep-read a codebase area, write findings to `research.md`.
- `/plan` — Create a detailed implementation plan in `plan.md`.
- `/refine` — Address inline notes you've added to the plan.
- `/todo` — Add a granular task breakdown to the plan.
- `/implement` — Execute the plan mechanically, marking progress.
- `/review` — Optional post-implementation sanity check.

Also includes [agent-agnostic prompt snippets](plugins/phased-work/snippets.md)
for use with any AI coding assistant.

### Deprecated: [fd](plugins/fd/)

Initializes a lightweight Feature Design (FD) tracking system in any project.
Scaffolds directory structure, templates, index, project-local slash commands,
and CLAUDE.md conventions for the full FD lifecycle.

- `/fd-init` — Set up the FD system in the current project.

Based on the
[Feature Design system by manuelschipper](https://gist.github.com/manuelschipper/149ebf6b2d150ccaccc84ee9a9df560f).

### Agent Config Installation

`packages/agent-config` exposes the `agent-config` CLI used by the Mise tasks.
The CLI keeps the existing command contract while delegating rule and harness
commands to their workspace packages. Its `install` command reads
`agent-config.toml` to create fixed symlinks, discover configured skill roots,
clean stale managed symlinks, register Claude plugin marketplaces, and install
configured Claude plugins. To add or remove auto-installed plugins, edit
`agent-config.toml`. The loader checks config files in this order:
`agent-config.toml`, `agent-config.yaml`, `agent-config.yml`, then
`agent-config.json`.

Config source paths are repo-relative. Home-side target paths must be explicit
and start with `~/`, including `symlinks[].target`,
`skillSymlinks[].targetRoots[]`, and `staleSymlinkCleanup[].targetDir`.

The JSON schema at `schemas/agent-config.schema.json` is generated from the
package source. Run `mise run agent-config:schema:build` after changing the
schema, or `mise run agent-config:schema:check` to verify it is current.

Requires the `claude` CLI. Skipped gracefully if it is missing.

## Requirements

- Bun 1.3+

## License

This is a personal configuration repository. Feel free to use it as inspiration
for your own setup, but there are no guarantees it won't teach your agents some
questionable habits.
