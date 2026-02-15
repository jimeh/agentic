---
allowed-tools: Bash(git fetch:*), Bash(git rebase:*), Bash(git stash:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git branch:*), Bash(git rev-parse:*), Read, Edit
description: Rebase current branch onto upstream main/master
---

## Context

- Current branch: !`git branch --show-current`
- Default branch: !`git rev-parse --abbrev-ref origin/HEAD 2>/dev/null`
- Uncommitted changes: !`git status --short`

## Your Task

Rebase the current branch onto the upstream default branch (main or master).

1. If there are uncommitted changes, stash them first with
   `git stash push -m "auto-stash before rebase"`.
2. Fetch the latest from origin: `git fetch origin`.
3. Rebase onto the default branch using the value from context above:
   `git rebase <default-branch>`.
4. If the rebase succeeds and changes were stashed in step 1, run
   `git stash pop`.
5. Show the result with `git log --oneline -10`.

If the rebase fails due to conflicts, attempt to resolve them yourself.
If you have low confidence in the resolution, abort the rebase with
`git rebase --abort`, restore any stashed changes with `git stash pop`,
and ask the user to resolve manually — leaving the working tree as it
was found.

You have the capability to call multiple tools in a single response. Do not
use any other tools or do anything else. Do not send any other text or
messages besides these tool calls.
