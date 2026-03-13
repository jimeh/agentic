---
name: Git Commit, Push & PR
description: >-
  This skill should be used when the user asks to "create a pull request",
  "open a PR", "submit a PR", "send a PR", "make a PR for this", "PR these
  changes", or otherwise requests creating a pull request from current
  changes.
---

# Git Commit, Push & PR

Commit current changes, push to remote, and open a pull request in a single
workflow.

## Workflow

### 1. Gather Context

Run these commands to understand the current state:

- `git status` — see tracked/untracked files
- `git diff HEAD` — see all staged and unstaged changes
- `git branch --show-current` — identify current branch
- `git log --oneline -10` — match existing commit message style
- `find . -maxdepth 3 -iname 'pull_request_template*' -o -ipath '*pull_request_template/*' 2>/dev/null`
  — locate PR templates

### 2. Branch

If on main/master, create a new branch named for the changes.

If already on a non-main branch, check if the name looks randomly generated
(UUIDs, hex strings, meaningless sequences, or 1-3 random unrelated words like
"brave-fox"). If so, rename with `git branch -m <descriptive-name>`.

### 3. Commit

Stage all relevant changes and create a single commit with a conventional commit
message. Lead with "why" over "what".

When asked to commit only staged changes, run `git diff --staged` to see exactly
what is staged, base the commit message solely on those changes, and do NOT
stage additional files.

### 4. Push

Push the branch to origin with `git push -u origin <branch>`.

### 5. Understand Full Scope

Run `git log` and `git diff main...HEAD` (or master) to see all changes since
the base branch. This ensures the PR description covers everything, not just the
latest commit.

### 6. Create PR

Use `gh pr create` to open the pull request.

- **PR template**: if a template was found in step 1, use it as the base for the
  PR body. If multiple templates were found, ask which one to use.
- **Description**: explain _what_ changed and _why_, covering the full scope of
  all commits. Do NOT list individual commits — the PR already shows those.
- **Footer**: append at the end of the PR body:
  `Generated with [Claude Code](https://claude.ai/code)`

## Guidelines

- Use parallel tool calls where possible to minimize round-trips
- Minimize text output — focus on tool calls
- Prefer conventional commits format, but defer to project conventions
