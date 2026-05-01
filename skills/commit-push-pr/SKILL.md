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

### 2. Check Agent Docs

If the project has an AGENTS.md or CLAUDE.md, review it against the current
changes. If changes introduce new conventions, commands, architecture, or
patterns that should be documented (or invalidate existing docs), update the
relevant file as part of this commit. Only update if clearly warranted — avoid
adding noise.

Things worth documenting:

- Non-obvious conventions or patterns not apparent from code structure alone
- Surprising behaviors, gotchas, or workarounds discovered during development
- Implicit dependencies or ordering constraints between components
- Environment-specific quirks (platform differences, tool version sensitivities)
- Undocumented requirements or constraints found through trial and error

### 3. Branch

If on main/master, create a new branch named for the changes.

If already on a non-main branch, check if the name looks randomly generated
(UUIDs, hex strings, meaningless sequences, or 1-3 random unrelated words like
"brave-fox"). If so, rename with `git branch -m <descriptive-name>`.

### 4. Commit

Stage all relevant changes and create a single commit with a conventional commit
message. Lead with why over what. The commit body should start with the reason
for the change; technical overview and implementation notes come after. Make the
problem, context, or reason for the change clear before describing
implementation details when that reason is supported by the available evidence.
If the rationale is unclear, do not guess; ask the user.

If the reason behind a change is not clear from context, ask the user before
committing.

Never stage or commit files ignored by git unless the user explicitly asks. Do
not use `git add -f`, `git add --force`, or equivalent to include ignored files.

When asked to commit only staged changes, run `git diff --staged` to see exactly
what is staged, base the commit message solely on those changes, and do NOT
stage additional files.

### 5. Push

Push the branch to origin with `git push -u origin <branch>`.

### 6. Understand Full Scope

Run `git log` and `git diff main...HEAD` (or master) to see all changes since
the base branch. This ensures the PR description covers everything, not just the
latest commit.

### 7. Create PR

Use `gh pr create` to open the pull request.

- **Title**: use conventional commits format when the repo follows that
  convention
- **PR template**: if a template was found in step 1, use it as the base for the
  PR body. If multiple templates were found, ask which one to use.
- **Description**: lead with the motivation and purpose behind the change —
  before technical details. Start with the problem, context, or reason the
  change is needed when that can be supported by the available evidence, then
  cover the implementation. If the rationale is unclear, do not guess; stick to
  the confirmed scope of the branch or ask the user. Cover the full scope of all
  commits. Do NOT list individual commits — the PR already shows those.

## Guidelines

- Use parallel tool calls where possible to minimize round-trips
- Minimize text output — focus on tool calls
- Prefer conventional commits format, but defer to project conventions
- Pass commit messages and PR bodies via heredocs to avoid shell interpretation
  of backticks and other special characters in multi-line strings
- Treat `.gitignore` and other git exclude rules as authoritative for default
  commit scope
