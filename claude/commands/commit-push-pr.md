---
allowed-tools: Bash(git checkout --branch:*), Bash(git checkout -b:*), Bash(git branch -m:*), Bash(git add:*), Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*), Bash(find:*)
description: Commit, push, and open a PR, rename branch appropriately if needed
source: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/commit-commands/commands/commit-push-pr.md
notes: Heavily modified from the original.
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`
- PR template: !`find . -maxdepth 3 -iname 'pull_request_template*' -o -ipath '*pull_request_template/*' 2>/dev/null`

## Your Task

Based on the above changes:

1. **Branch**: If on main/master, create a new branch named for the changes.
2. **Branch name**: If already on a non-main branch, check if the name looks
   randomly generated (UUIDs, hex strings, meaningless sequences, or 1-3 random
   unrelated words like "brave-fox"). If so, rename with
   `git branch -m <descriptive-name>`.
3. **Commit**: Stage all relevant changes and create a single commit. If asked
   to commit only staged changes, run `git diff --staged` and base the message
   solely on those — do NOT stage additional files.
4. **Push** the branch to origin.
5. **Understand full scope**: Run `git log` and `git diff main...HEAD` (or
   master) to see all changes since the base branch.
6. **PR template**: If a PR template was found in the context above, use it
   as the base for the PR body. If multiple templates were found, ask which
   one to use.
7. **Create PR** with `gh pr create`. Description should explain *what* changed
   and *why*, covering the full scope. Do NOT list commits — the PR already
   shows those. Append at the end:
   `🤖 Generated with [Claude Code](https://claude.ai/code)`

Do all of the above in a single message using parallel tool calls where
possible. Do not send any other text or messages besides tool calls.
