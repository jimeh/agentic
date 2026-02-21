# bash-approval-hook

Go PreToolUse hook that auto-approves Bash commands matching Claude Code
allow/deny patterns. Normalizes git path flags (`-C`, `--git-dir`,
`--work-tree`) pointing at the current project before matching.

## Commands

```bash
make              # build release binary
make debug-build  # build with file logging (ldflags-gated, zero overhead in release)
make check        # vet + lint + tests
```

## Fail-Closed Rules

Every uncertain condition returns "no opinion" (falls through to normal
permission flow):

- Unknown/malformed git global options before the subcommand
- Value options accepted only as `--opt=value` (e.g. `--list-cmds`)
- Dynamic shell constructs: command substitution, heredocs, redirections,
  variable expansion
- Path resolution errors (symlinks, missing dirs)
- Permission file read/parse errors or empty allow set

Git flags like `-C` are only treated as global flags *before* the subcommand;
after it they may be command-local (e.g. `git log -C`).

## Permission Patterns

Three matching styles (plus legacy):

- `Bash(cmd *)` — space+star: word-boundary prefix match
- `Bash(ls*)` — bare glob (`*` = any chars)
- `Bash(cmd)` — exact match
- `Bash(cmd:*)` — legacy colon-star: word-boundary prefix (deprecated)

## Gotchas

- Avoid `filepath.Join`/`filepath.Abs` before symlink-sensitive checks — they
  lexically collapse `..`, hiding traversal via symlinks. Use `EvalSymlinks`
  and fail closed on resolution errors.
- Tests exercising permission loading must override the managed settings path
  resolver to a temp path so machine-global settings don't leak into results.
