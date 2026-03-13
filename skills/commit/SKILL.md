---
name: Git Commit
description: >-
  This skill should be used when the user asks to "commit my changes", "create
  a commit", "commit this", "make a commit", "git commit", or otherwise
  requests creating a git commit from current changes.
---

# Git Commit

Create a well-crafted git commit from the current working tree changes.

## Workflow

### 1. Gather Context

Run all four commands to understand the current state:

- `git status` — see tracked/untracked files
- `git diff HEAD` — see all staged and unstaged changes
- `git branch --show-current` — identify current branch
- `git log --oneline -10` — match existing commit message style

### 2. Check Agent Docs

If the project has an AGENTS.md or CLAUDE.md, review it against the current
changes. If changes introduce new conventions, commands, architecture, or
patterns that should be documented (or invalidate existing docs), update the
relevant file as part of this commit. Only update if clearly warranted — avoid
adding noise.

### 3. Create the Commit

Stage all relevant changes and create a single commit with a conventional commit
message (e.g., `feat:`, `fix:`, `refactor:`). Lead the message with "why" over
"what" — the diff shows what changed; the message explains motivation and
purpose.

### Staged-Only Mode

When asked to commit only staged changes:

1. Run `git diff --staged` to see exactly what is staged
2. Base the commit message solely on those changes
3. Do NOT stage additional files

## Guidelines

- Prefer conventional commits format, but defer to project conventions
- Minimize text output — focus on tool calls
- Call multiple tools in parallel when there are no dependencies between them
