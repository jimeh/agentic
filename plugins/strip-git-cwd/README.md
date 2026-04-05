# strip-git-cwd

Claude Code plugin that strips redundant `git -C <path>` flags when the path
matches the current working directory.

## Problem

Claude Code frequently runs git commands with redundant working-directory
references — either `git -C /current/dir status` or
`cd /current/dir && git status` — even when already in `/current/dir`. Both
forms are unnecessary and add noise to the command output.

## What It Does

A `PreToolUse` hook intercepts Bash tool calls and strips redundant cwd
references from git commands. The cleaned command is passed back to Claude's
normal permission flow.

**Pattern 1 — `cd` prefix (git commands only):**

- `cd /path && git ...` → `git ...`
- `cd /path; git ...` → `git ...`
- Quoted paths: `cd "/path" && git ...` / `cd '/path' && git ...`

**Pattern 2 — `-C` flag:**

- `git -C /path ...` (space-separated)
- `git -C=/path ...` (equals form)
- `git -C/path ...` (no separator)
- `git -C "/path" ...` / `git -C '/path' ...` (quoted)

Both patterns compose — `cd /path && git -C /path status` becomes `git status`.
Compound commands (`&&`, `||`, `;`) are handled.

## Install

```bash
# Add the marketplace (once)
claude plugin marketplace add jimeh/agentic

# Install the plugin
claude plugin install strip-git-cwd@jimeh-agentic
```

Or from within Claude Code:

```text
/plugin marketplace add jimeh/agentic
/plugin install strip-git-cwd@jimeh-agentic
```
