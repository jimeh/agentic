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

`setup.sh` auto-discovers and symlinks two types of content:

- **Commands**: any `.md` in `claude/commands/` → `~/.claude/commands/`
- **Skills**: any `skills/*/` dir with a `SKILL.md` → `~/.claude/skills/` and
  `~/.agents/skills/`

To add a new command or skill, just create the file — `setup.sh` picks it up
automatically. Stale symlinks are cleaned up on each run.

### RULES.md

Single source of truth for agent instructions. Symlinked as the global
`CLAUDE.md` and `AGENTS.md` for all supported agents. Always edit this file —
never edit the symlink targets directly.

### Agent-Specific Config

- `claude/` — Claude Code settings, slash commands, statusline script
- `codex/` — OpenAI Codex config (TOML)

## Shell Conventions

2-space indent, `bash` variant, switch case indent, space redirects (`> file`
not `>file`). See `.editorconfig` for shfmt flags.
