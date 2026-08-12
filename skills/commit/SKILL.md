---
name: commit
description: >-
  Create a Git commit from the current working tree or index. Use when the user
  asks to commit changes, including staged-only or explicitly scoped commits.
  Do not push or open a pull request.
---

# Commit

Create exactly the commit the user asked for while preserving everything outside
its scope.

## Establish Scope

Read the repository instructions, then inspect:

- `git status --short`
- the staged and unstaged diffs relevant to the request
- the current branch
- recent commit subjects for repository style

Treat user scope literally. "Staged" means the current index only; named paths
mean those paths only. Do not stage, unstage, normalize, or otherwise alter
unrelated work. Never include ignored files unless the user explicitly asks.
When the user scopes the commit to the current files on disk, treat that
snapshot as exact: do not edit those files or generate additional changes before
staging the requested content.

If the commit will leave unrelated staged entries behind, snapshot their staged
status, index entries, and cached diff before committing. Use a commit mechanism
that includes only the intended paths or hunks without rewriting the unrelated
index.

Create or rename a branch only when the user asked. Never rename a protected or
default branch.

## Prepare the Commit

Review the complete commit diff and check whether the change revealed a durable,
non-obvious convention that belongs in `AGENTS.md` or the project-level
`CLAUDE.md`. Update agent documentation only when clearly warranted.

Run the strongest proportionate verification that has not already been run for
this exact change. Do not manufacture a broad validation pass merely because a
commit is being created.

Stage only the intended changes. Before committing, verify the staged diff and
run `git diff --staged --check` when it applies.

## Write the Message

Follow repository history, preferring conventional commits when no stronger
local convention exists. Lead with the motivation or durable outcome rather than
an inventory of changed files. Do not invent rationale; ask if the reason is
material and genuinely unclear.

Use a body only when it adds useful context. Pass multiline messages safely so
shell interpolation cannot alter them.

## Verify the Result

After committing, inspect the new commit and working tree. Confirm that:

- the commit contains exactly the intended changes;
- unrelated staged and unstaged work remains intact;
- any snapshotted index state is byte-for-byte unchanged; and
- no push or pull request mutation occurred.
