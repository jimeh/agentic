---
allowed-tools: Bash(git checkout --branch:*), Bash(git checkout -b:*), Bash(git add:*), Bash(git diff:*), Bash(git status:*), Bash(git commit:*)
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
   if clearly warranted — don't add noise.
2. **Branch safety**: If the user asks to commit on a new branch, first inspect
   the current branch. If on `main`, `master`, or the repository's
   default/protected branch, create a new branch with
   `git checkout -b <descriptive-name>`. Never rename these branches. Do not use
   `git branch -m` from this command.
3. Create a single git commit. If asked to commit only staged changes, run
   `git diff --staged` to see exactly what is staged, and base the commit
   message solely on those changes. Do NOT stage additional files. Otherwise,
   stage all relevant changes and create the commit. Never stage or commit files
   ignored by git unless the user explicitly asks. Do not use `git add -f`,
   `git add --force`, or equivalent to include ignored files.

You have the capability to call multiple tools in a single response. Do not use
any other tools or do anything else. Do not send any other text or messages
besides these tool calls.
