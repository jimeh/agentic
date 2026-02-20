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

### Hooks

`claude/hooks/` contains hook shell wrappers symlinked into `~/.claude/hooks/`.
`claude/bash-approval-hook/` is a Go project that auto-approves git commands
using `-C`, `--git-dir`, or `--work-tree` flags pointing at the current project
directory. It normalizes those commands by stripping the path flags and checks
the result against the Bash allow/deny patterns in Claude Code settings.
Only treat these as git global flags before the subcommand; after the
subcommand they can be command-local flags (for example `git log -C`).
The hook's git-prefix parser is fail-closed: unknown or malformed
pre-subcommand global options are rejected (no opinion) rather than passed
through. For safety, some value options are accepted only in `--opt=value`
form (for example `--list-cmds`).
The command extractor is also fail-closed for dynamic shell constructs:
command substitution, heredocs, redirections, variable expansion, and similar
features return no opinion even when the outer command is otherwise allowed.
Example: `gh pr create --body "$(cat <<'EOF' ... EOF)"` is rejected.
Tests that exercise main hook permission loading should override the managed
settings path resolver to a temp path so machine-global managed settings do not
leak into test results.

Permission patterns support three matching styles (plus legacy):

- `Bash(npm run lint *)` — space+star suffix: word-boundary prefix match
- `Bash(ls*)` — bare-star / star anywhere: glob match (`*` = any chars)
- `Bash(npm run compile)` — no wildcards: exact match
- `Bash(git status:*)` — legacy `:*` suffix: word-boundary prefix (deprecated)

Path validation gotcha:

- Avoid `filepath.Join`/`filepath.Abs` before symlink-sensitive checks. Both
  lexically collapse `..`, which can hide traversal patterns like
  `symlink/..`. Preserve raw relative segments and resolve components in order
  with `EvalSymlinks`, failing closed on resolution errors.

Build and validate:

```bash
cd claude/bash-approval-hook
make              # build the binary
make debug-build  # build debug binary with file logging enabled
make check        # run vet + lint + tests
```

### Agent-Specific Config

- `claude/` — Claude Code settings, slash commands, statusline script, hooks
- `codex/` — OpenAI Codex config (TOML)

## Before Committing

Check if `README.md` or this `AGENTS.md` file need updates to reflect your
changes (new commands, skills, structural changes, conventions, etc.).

## Shell Conventions

2-space indent, `bash` variant, switch case indent, space redirects (`> file`
not `>file`). See `.editorconfig` for shfmt flags.
