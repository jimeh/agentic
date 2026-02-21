# AGENTS.md

Shared configuration and rules for AI coding agents (Claude Code, Codex, etc).
`setup.sh` symlinks configs into `~/.claude/`, `~/.agents/`, `~/.codex/`.

## Commands

```bash
./setup.sh          # create symlinks (skips existing)
./setup.sh --force  # replace existing (backs up to .bak)
shellcheck **/*.sh  # lint all shell scripts
```

## Architecture

`setup.sh` auto-discovers and symlinks three types of content:

- **Commands**: any `.md` in `claude/commands/` → `~/.claude/commands/`
- **Skills**: any `skills/*/` dir with a `SKILL.md` → `~/.claude/skills/` and
  `~/.agents/skills/`
- **Plugins**: any `plugins/*/` dir with a `.claude-plugin/plugin.json` →
  `~/.claude/plugins/`

To add a new command, skill, or plugin, just create the file — `setup.sh`
picks it up automatically. Stale symlinks are cleaned up on each run.

### Marketplace Manifest

`.claude-plugin/marketplace.json` at the repo root lists all publishable
plugins with metadata (name, version, description, source path, category).

### RULES.md

Single source of truth for agent instructions. Symlinked as the global
`CLAUDE.md` and `AGENTS.md` for all supported agents. Always edit this file —
never edit the symlink targets directly.

### Agent-Specific Config

- `claude/` — Claude Code settings, slash commands, statusline script
- `codex/` — OpenAI Codex config (TOML)

## Testing

Plugin tests live in `plugins/*/tests/*.test.sh`. CI auto-discovers and runs
them. Tests must be self-contained bash scripts that exit 0 on success.

## Before Committing

Check if `README.md` or this `AGENTS.md` file need updates to reflect your
changes (new commands, skills, structural changes, conventions, etc.).

## Shell Conventions

2-space indent, `bash` variant, switch case indent, space redirects (`> file`
not `>file`). See `.editorconfig` for shfmt flags.
