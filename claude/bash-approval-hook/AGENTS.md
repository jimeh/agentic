# bash-approval-hook

Go `PreToolUse` hook that rewrites Bash git commands by stripping git global
path flags (`-C`, `--git-dir`, `--work-tree`) when they resolve to the current
project directory. Rewrites are returned via `hookSpecificOutput.updatedInput`.

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
- Any normalization failure in any parsed subcommand (all-or-nothing)

Git flags like `-C` are only treated as global flags *before* the subcommand;
after it they may be command-local (e.g. `git log -C`).

## Output Contract

When rewrites happen, output JSON shape is:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecisionReason": "Stripped git global path flags that match cwd",
    "updatedInput": {
      "command": "git status"
    }
  }
}
```

## Gotchas

- Avoid `filepath.Join`/`filepath.Abs` before symlink-sensitive checks — they
  lexically collapse `..`, hiding traversal via symlinks. Use `EvalSymlinks`
  and fail closed on resolution errors.
- Returning `permissionDecision: allow` does not bypass Claude's own
  permission checks for the resulting command. For command normalization, use
  `updatedInput` rewrites.
