---
allowed-tools: Bash(git checkout --branch:*), Bash(git checkout -b:*), Bash(git branch -m:*), Bash(git add:*), Bash(git diff:*), Bash(git status:*), Bash(git commit:*)
description: Create a git commit
source: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/commit-commands/commands/commit.md
notes: Heavily modified from the original.
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

Based on the above changes:

1. **Check agent docs**: If the project has an AGENTS.md or CLAUDE.md, review it
   against the current changes. If the changes introduce new conventions,
   commands, architecture, or patterns that should be documented (or invalidate
   existing docs), update the relevant file as part of this commit. Only update
   if clearly warranted — don't add noise. Things worth documenting:
   - Non-obvious conventions or patterns not apparent from code structure alone
   - Surprising behaviors, gotchas, or workarounds discovered during development
   - Implicit dependencies or ordering constraints between components
   - Environment-specific quirks (platform differences, tool version
     sensitivities)
   - Undocumented requirements or constraints found through trial and error
2. **Branch safety**: If the user asks to commit on a new branch, first inspect
   the current branch. If on `main`, `master`, or the repository's
   default/protected branch, create a new branch with
   `git checkout -b <descriptive-name>`. Never rename these branches. Only use
   `git branch -m <descriptive-name>` when already on a non-main branch whose
   name appears generated, random, or unrelated to the current work, such as
   UUIDs, hex strings, meaningless sequences, or 1-3 unrelated words. If the
   branch name is meaningful or user-provided, keep it.
3. **Create the commit**: Stage all relevant changes and create a single commit
   with a conventional commit message (e.g., `feat:`, `fix:`, `refactor:`). Lead
   with why over what — the diff shows what changed; the message explains
   motivation and purpose. The commit body should start with the reason for the
   change; technical overview and implementation notes come after. If the
   rationale is unclear, do not guess; ask the user. If asked to commit only
   staged changes, run `git diff --staged` to see exactly what is staged, and
   base the commit message solely on those changes — do NOT stage additional
   files. Never stage or commit files ignored by git unless the user explicitly
   asks. Do not use `git add -f`, `git add --force`, or equivalent to include
   ignored files.

## Guidelines

- Prefer conventional commits format, but defer to project conventions
- Pass commit messages via a heredoc to avoid shell interpretation of backticks
  and other special characters in multi-line messages
- Treat `.gitignore` and other git exclude rules as authoritative for default
  commit scope
- Minimize text output — focus on tool calls

You have the capability to call multiple tools in a single response. Do not use
any other tools or do anything else. Do not send any other text or messages
besides these tool calls.
