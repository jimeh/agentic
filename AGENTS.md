# AGENTS.md

Shared configuration and rules for AI coding agents (Claude Code, Codex, etc).
`setup.sh` symlinks configs into `~/.claude/`, `~/.agents/`, `~/.codex/`.

## Commands

```bash
./setup.sh          # create symlinks (skips existing)
./setup.sh --force  # replace existing (backs up to .bak)
shellcheck **/*.sh  # lint all shell scripts
```

```bash
mise run format              # format with oxfmt + markdownlint --fix
mise run lint                # check with oxfmt + markdownlint
mise run format:oxfmt        # format with oxfmt only
mise run format:markdownlint # auto-fix markdownlint issues only
mise run lint:oxfmt          # check oxfmt formatting only
mise run lint:markdownlint   # lint with markdownlint only
```

## Architecture

`setup.sh` auto-discovers and symlinks skills:

- **Skills**: any `skills/*/` dir with a `SKILL.md` → `~/.claude/skills/` and
  `~/.agents/skills/`

To add a new skill, just create the directory — `setup.sh` picks it up
automatically. Stale symlinks are cleaned up on each run.

**Commands** live in plugins under `plugins/*/commands/`. Each plugin has a
`.claude-plugin/plugin.json` manifest and auto-discovered `.md` command files.

**Plugins** are installed via the Claude CLI, not symlinks. `setup.sh` ensures
the official `claude-plugins-official` marketplace and the local `jimeh-agentic`
marketplace are registered, then installs plugins listed in the `CLAUDE_PLUGINS`
array at the top of the script. Requires `claude` and `jq`.

### Marketplace Manifest

`.claude-plugin/marketplace.json` at the repo root lists all publishable plugins
with metadata (name, version, description, source path, category).

### RULES.md

Single source of truth for agent instructions. Symlinked as the global
`CLAUDE.md` and `AGENTS.md` for all supported agents. Always edit this file —
never edit the symlink targets directly.

### Agent-Specific Config

- `claude/` — Claude Code settings, statusline script
- `codex/` — OpenAI Codex config (TOML)

## Testing

Plugin tests live in `plugins/*/tests/*.test.sh`. CI auto-discovers and runs
them. Tests must be self-contained bash scripts that exit 0 on success.

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

## Markdown Formatting

oxfmt (`proseWrap: "always"`, 80 chars) and markdownlint handle formatting.
`embeddedLanguageFormatting: "off"` keeps oxfmt from touching YAML frontmatter.
Run `mise run format` before committing.

## Shell Conventions

2-space indent, `bash` variant, switch case indent, space redirects (`> file`
not `>file`). See `.editorconfig` for shfmt flags.
