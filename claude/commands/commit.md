---
allowed-tools: Bash(git add:*), Bash(git diff:*), Bash(git status:*), Bash(git commit:*)
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

1. **Check agent docs**: If the project has an AGENTS.md or CLAUDE.md, review
   it against the current changes. If the changes introduce new conventions,
   commands, architecture, or patterns that should be documented (or invalidate
   existing docs), update the relevant file as part of this commit. Only update
   if clearly warranted — don't add noise.
2. Create a single git commit. If asked to commit only staged changes, run
   `git diff --staged` to see exactly what is staged, and base the commit
   message solely on those changes. Do NOT stage additional files. Otherwise,
   stage all relevant changes and create the commit.

You have the capability to call multiple tools in a single response. Do not use
any other tools or do anything else. Do not send any other text or messages
besides these tool calls.
