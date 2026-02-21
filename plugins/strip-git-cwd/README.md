# strip-git-cwd

Claude Code plugin that strips redundant `git -C <path>` flags when the path
matches the current working directory.

## Problem

Claude Code frequently runs git commands like `git -C /current/dir status` even
when already working in `/current/dir`. The `-C` flag is unnecessary and adds
noise to the command output.

## What It Does

A `PreToolUse` hook intercepts Bash tool calls and removes `-C <path>` from git
commands when the path matches the working directory. The cleaned command is
passed back to Claude's normal permission flow.

**Supported forms:**

- `git -C /path ...` (space-separated)
- `git -C=/path ...` (equals form)
- `git -C/path ...` (no separator)
- `git -C "/path" ...` / `git -C '/path' ...` (quoted)

Compound commands (`&&`, `||`, `;`) are handled — all occurrences are replaced.

## Install

```bash
claude --plugin-dir /path/to/strip-git-cwd
```
