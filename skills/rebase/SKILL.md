---
name: Git Rebase
description: >-
  Rebases the current branch onto the upstream default branch. Triggers when the
  user says "rebase onto main", "rebase my branch", "update my branch from
  main", "rebase onto master", "sync with main", or otherwise requests rebasing
  onto the default branch.
---

# Git Rebase

Rebase the current branch onto the upstream default branch, handling stashing
and conflict resolution automatically.

## Workflow

### 1. Gather Context

Run these commands in parallel to understand the current state:

- `git branch --show-current` — identify the current branch
- `git rev-parse --abbrev-ref origin/HEAD` — determine the default branch
- `git status --short` — check for uncommitted changes

### 2. Stash Uncommitted Changes

If `git status --short` shows any output, stash changes before rebasing:

```
git stash push -m "auto-stash before rebase"
```

Remember whether a stash was created for step 5.

### 3. Fetch Latest

```
git fetch origin
```

### 4. Rebase

Rebase the current branch onto the default branch determined in step 1:

```
git rebase origin/<default-branch>
```

### 5. Restore Stashed Changes

If changes were stashed in step 2, restore them:

```
git stash pop
```

### 6. Show Result

Display the updated history:

```
git log --oneline -10
```

## Conflict Handling

If the rebase encounters conflicts:

1. Inspect the conflicting files and attempt resolution
2. After resolving, stage the files and run `git rebase --continue`
3. If confidence in the resolution is low, abort instead:
   ```
   git rebase --abort
   ```
   If changes were stashed, restore them with `git stash pop`, then ask the user
   to resolve conflicts manually.

## Guidelines

- Minimize text output — focus on tool calls
- Call multiple tools in parallel when there are no dependencies between them
- Never force-push without explicit user confirmation
