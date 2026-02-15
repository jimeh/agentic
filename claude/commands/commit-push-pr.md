---
allowed-tools: Bash(git checkout --branch:*), Bash(git branch -m:*), Bash(git add:*), Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*)
description: Commit, push, and open a PR, rename branch appropriately if needed
source: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/commit-commands/commands/commit-push-pr.md
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your Task

Based on the above changes:

1. **Check agent docs**: Read the project's AGENTS.md and/or CLAUDE.md if they
   exist. Review their content against the current changes. If the changes
   introduce new conventions, commands, architecture, or development patterns
   that should be documented (or invalidate existing documentation), update the
   relevant file as part of this commit. Only update if clearly warranted —
   don't add noise.
2. Create a new branch if on main or master. If already on a non-main/master
   branch, check if the branch name looks randomly generated (e.g. UUIDs, hex
   strings, meaningless character sequences, or 1-3 random unrelated words like
   "brave-fox" or "purple-mountain") rather than descriptive of the changes. If
   so, rename it to something that aligns with the changes using:
   `git branch -m <new-name>`.
3. Create a single commit with an appropriate message. If asked to commit only
   staged changes, run `git diff --staged` to see exactly what is staged, and
   base the commit message solely on those changes. Do NOT stage additional
   files. Otherwise, stage all relevant changes.
4. Push the branch to origin
5. Create a pull request using `gh pr create`. Use `git log` and
   `git diff main...HEAD` (or master) to understand all changes on the branch.
   The PR description should clearly explain *what* changed and *why*, covering
   the full scope of changes since main/master. Do NOT include a list of
   commits — the PR already shows those. Focus on a cohesive summary that
   helps a reviewer understand the purpose and impact of the changes. Check for
   a PR template at `.github/PULL_REQUEST_TEMPLATE.md` — if one exists, use it
   as the base for the PR body and fill in the sections appropriately.
6. You have the capability to call multiple tools in a single response. You MUST
   do all of the above in a single message. Do not use any other tools or do
   anything else. Do not send any other text or messages besides these tool
   calls.
