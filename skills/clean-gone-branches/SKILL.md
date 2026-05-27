---
name: clean-gone-branches
description: >-
  Clean up stale local Git branches whose upstream remote branches are marked
  [gone], including removing associated Git worktrees before branch deletion.
  Use when the user asks to clean gone branches, remove branches deleted from
  the remote, prune stale local Git branches, delete branches with [gone]
  status, or run the clean-gone-branches Git workflow. By default, preview the
  gone branches with the bundled dry-run script and ask for confirmation before
  deleting; skip confirmation only when the user explicitly asks to delete all
  gone branches immediately or without confirmation.
---

# Clean Gone Branches

Remove local Git branches whose tracked upstream branch no longer exists on the
remote. If a gone branch has an associated worktree, remove that worktree before
deleting the branch.

## Workflow

### 1. Use the Bundled Script

Run cleanup through the bundled script:

```bash
<skill-dir>/scripts/clean-gone-branches.sh
```

Resolve `<skill-dir>` to this skill's directory, then run the script from the
Git repository the user wants cleaned. Keep surrounding judgment focused on the
repo state and script output rather than reimplementing the cleanup logic.

### 2. Confirm Repository State

Run these commands from the current repository:

- `git status --short` - note uncommitted changes without modifying them
- `git branch --show-current` - identify the currently checked out branch
- `git rev-parse --show-toplevel` - identify the main worktree root
- `git worktree list --porcelain` - inspect attached worktrees

Do not use `git -C`; stay in the current working directory unless the user
explicitly asks to operate elsewhere.

### 3. Preview Cleanup and Ask

Run the script in dry-run mode first:

```bash
<skill-dir>/scripts/clean-gone-branches.sh --dry-run
```

The script runs `git fetch --prune` by default. If fetching fails because of
authentication, network access, or a missing remote, stop and report the
failure. Deleted upstream branches may not show as `[gone]` until remote refs
are pruned.

Use the dry-run output as the source of truth for which branches and worktrees
are pending removal. Show that summary to the user and ask whether to delete all
listed gone branches.

The preview response must name every branch that would be deleted in a Markdown
bullet list. Do not summarize only with a count or inline the branch names in a
paragraph. If the dry run includes worktrees to remove or branches to skip, add
separate bullet lists for those paths and skipped branch names too.

If the script reports no gone branches, report that no cleanup is needed and
stop.

### 4. Run Cleanup

After the user confirms, run:

```bash
<skill-dir>/scripts/clean-gone-branches.sh --no-fetch
```

Use `--no-fetch` after a successful dry run so cleanup acts on the same pruned
remote-tracking state shown in the preview.

If the user's initial request explicitly says to delete/remove all gone branches
without confirmation, skip the confirmation prompt and run the cleanup command
immediately after the dry run. Still use the dry run first so the script, not
the agent, identifies the removal set.

### 5. Report Results

Summarize only the useful facts from the script output:

- Worktrees removed
- Branches deleted
- Branches skipped and why
- Whether no cleanup was needed

## Implementation Notes

The script uses `git for-each-ref` instead of parsing the display layout from
`git branch -vv`. This keeps gone-branch detection stable while still allowing
the preview workflow to show human-readable branch status when useful.

Plain `git branch -v` shows `[gone]`; `git branch -vv` adds the upstream ref,
such as `[origin/my-branch: gone]`.

Branches checked out in another worktree must have that worktree removed before
the branch can be deleted. If the gone branch is checked out in the current
worktree, skip it and tell the user to check out a different branch before
cleanup can delete it.

The script deletes branches with `git branch -D` because a gone upstream can
leave local commits that Git would otherwise protect with `-d`; the user
explicitly asked for stale gone-branch cleanup.
