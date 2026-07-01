---
name: rebase
description: >-
  Rebases the current branch onto the upstream default branch and checks whether
  newly landed upstream changes affect the branch's design. Triggers when the
  user says "rebase onto main", "rebase my branch", "update my branch from
  main", "rebase onto master", "sync with main", or otherwise requests rebasing
  onto the default branch.
---

# Git Rebase

Rebase the current branch onto the upstream default branch, handling stashing
and conflict resolution automatically. Treat the rebase as integration work, not
just history movement: new upstream commits may already solve part of the same
problem, change the surrounding design, or make local commits too broad.

## Workflow

### 1. Gather Context

Run these commands in parallel to understand the current state:

- `git branch --show-current` — identify the current branch
- `git rev-parse --abbrev-ref origin/HEAD` — determine the default branch
- `git status --short` — check for uncommitted changes

Use the `origin/HEAD` output as the full upstream ref, for example
`origin/main`. Do not prepend another `origin/` to it later.

### 2. Stash Uncommitted Changes

If `git status --short` shows any output, stash changes before rebasing:

```bash
git stash push -m "auto-stash before rebase"
```

Remember whether a stash was created for step 6.

### 3. Fetch Latest

```bash
git fetch origin
```

After fetching, resolve and record the exact refs used for the integration
review:

```bash
upstream_ref="$(git rev-parse --abbrev-ref origin/HEAD)"
pre_rebase_head="$(git rev-parse HEAD)"
pre_rebase_base="$(git merge-base HEAD "$upstream_ref")"
```

### 4. Review Incoming Upstream Changes

Before rebasing, inspect what landed upstream since the branch's current base.
This is the checkpoint that prevents two parallel implementations of the same
idea from surviving unnoticed.

First identify the branch surface:

```bash
git diff --name-only "$pre_rebase_base"...HEAD
```

Then inspect upstream commits that touched the same files or nearby systems:

```bash
git log --oneline --stat "$pre_rebase_base".."$upstream_ref" -- <paths>
git diff --name-status "$pre_rebase_base".."$upstream_ref" -- <paths>
```

Replace `<paths>` with the files or directories identified from the branch
surface. Use multiple paths when the branch spans a workflow.

If the branch touches broad behavior, also search the upstream diff for the
feature names, functions, config keys, migrations, routes, or tests involved.

While reviewing, ask:

- Did upstream already implement the same fix, even in narrower form?
- Did upstream introduce a new abstraction, convention, or source of truth that
  local commits should now use?
- Did upstream remove, rename, or restructure code that local commits still
  depend on?
- Would keeping both upstream and branch-local implementations create duplicate
  behavior, competing configuration, or inconsistent validation?

### 5. Rebase

Rebase the current branch onto the full upstream ref recorded above:

```bash
git rebase "$upstream_ref"
```

### 6. Restore Stashed Changes

If changes were stashed in step 2 and the rebase succeeded, restore them:

```bash
git stash pop
```

### 7. Integration Review

After the rebase, inspect whether the branch still makes sense on top of the new
upstream state:

```bash
git range-diff "$pre_rebase_base".."$pre_rebase_head" "$upstream_ref"..HEAD
git diff --check "$upstream_ref"...HEAD
git diff --stat "$upstream_ref"...HEAD
```

Use `range-diff` to confirm the branch commits survived as intended, not just
that Git replayed them mechanically. If `range-diff` is unavailable or noisy,
fall back to `git log --oneline "$upstream_ref"..HEAD` and targeted
`git diff "$upstream_ref"...HEAD -- <paths>`.

Adapt the branch during the rebase only when the upstream changes make the
current changeset wrong, duplicate, inconsistent, or impossible to validate. If
the rebased branch still works but could be simplified to use the new upstream
approach, finish the rebase and report that as follow-up work instead of
expanding the rebase scope.

### 8. Show Result

Display the updated history:

```bash
git log --oneline -10
```

Report the outcome briefly:

- upstream ref used
- whether overlapping upstream changes were found
- whether local commits were adapted
- recommended follow-up refactors, if any

## Conflict Handling

If the rebase encounters conflicts:

1. Inspect both sides of the conflict and the upstream commits that introduced
   the conflicting code.
2. Prefer the upstream design when it now provides the broader source of truth,
   unless the local branch intentionally extends it.
3. Resolve conflicts so the final branch has one coherent implementation, not
   both versions side by side.
4. After resolving, stage the files and run `git rebase --continue`
5. If confidence in the resolution is low, abort instead:
   ```bash
   git rebase --abort
   ```
   If changes were stashed, restore them with `git stash pop`, then ask the user
   to resolve conflicts manually.

## Guidelines

- Minimize text output — focus on tool calls
- Call multiple tools in parallel when there are no dependencies between them
- Never force-push without explicit user confirmation
