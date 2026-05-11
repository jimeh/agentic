---
allowed-tools: Bash(git checkout --branch:*), Bash(git checkout -b:*), Bash(git branch -m:*), Bash(git add:*), Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*), Bash(find:*), Bash(cat:*)
description: Commit, push, and open a PR, rename branch appropriately if needed
source: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/commit-commands/commands/commit-push-pr.md
notes: Heavily modified from the original.
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`
- PR template search:
  !`find . -maxdepth 4 \( -path './.git' -o -path './node_modules' -o -path './vendor' \) -prune -o \( -iname 'pull_request_template*' -o -ipath '*/pull_request_template/*' \) -print 2>/dev/null`

## Your Task

Based on the above changes:

1. **Branch**: If on main/master, create a new branch named for the changes.
2. **Branch name**: If already on a non-main branch, check if the name looks
   randomly generated (UUIDs, hex strings, meaningless sequences, or 1-3 random
   unrelated words like "brave-fox"). If so, rename with
   `git branch -m <descriptive-name>`.
3. **Commit**: Stage all relevant changes and create a single commit. If asked
   to commit only staged changes, run `git diff --staged` and base the message
   solely on those — do NOT stage additional files. Never stage or commit files
   ignored by git unless the user explicitly asks. Do not use `git add -f`,
   `git add --force`, or equivalent to include ignored files.
4. **Push** the branch to origin.
5. **Understand full scope**: Run `git log` and `git diff main...HEAD` (or
   master) to see all changes since the base branch.
6. **PR template**: Determine whether the PR template search found no template,
   one template, or multiple templates. If one template was found, read it
   before drafting the PR body and use it as the body structure. If multiple
   templates were found and no obvious default exists, ask which one to use. Do
   not run `gh pr create` until template status is known.
7. **Create PR** with `gh pr create`. Description should explain _what_ changed
   and _why_, covering the full scope. Preserve meaningful template headings and
   checklists when a template is used. Do NOT list commits — the PR already
   shows those.

Do all of the above in a single message using parallel tool calls where
possible. Do not send any other text or messages besides tool calls.
