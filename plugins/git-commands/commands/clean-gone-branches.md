---
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git worktree:*), Bash(git fetch:*), Bash(git for-each-ref:*), Bash(${CLAUDE_PLUGIN_ROOT}/scripts/clean-gone-branches.sh:*)
description: Cleans up all git branches marked as [gone] (branches that have been deleted on the remote but still exist locally), including removing associated worktrees.
source: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/commit-commands/commands/clean_gone.md
notes: Heavily modified from the original; logic lives in the bundled script.
---

## Context

- Current branch: !`git branch --show-current`
- Uncommitted changes: !`git status --short`
- Main worktree root: !`git rev-parse --show-toplevel`
- Attached worktrees: !`git worktree list --porcelain`

## Your Task

Remove local Git branches whose tracked upstream branch no longer exists on the
remote. If a gone branch has an associated worktree, remove that worktree before
deleting the branch. All cleanup logic lives in the bundled script — drive it,
don't reimplement it.

1. **Preview cleanup**: Run the bundled script in dry-run mode first:

   ```bash
   "${CLAUDE_PLUGIN_ROOT}/scripts/clean-gone-branches.sh" --dry-run
   ```

   The script runs `git fetch --prune` by default. If fetching fails because of
   authentication, network access, or a missing remote, stop and report the
   failure — deleted upstream branches may not show as `[gone]` until remote
   refs are pruned. Use the dry-run output as the source of truth for which
   branches and worktrees are pending removal.

2. **Show and confirm**: Present the dry-run summary to the user and ask whether
   to delete all listed gone branches. Name every branch that would be deleted
   in a Markdown bullet list — do not summarize only with a count or inline the
   names in a paragraph. If the dry run includes worktrees to remove or branches
   to skip, add separate bullet lists for those paths and skipped names too. If
   the script reports no gone branches, report that no cleanup is needed and
   stop.

   If the user's initial request explicitly asks to delete/remove all gone
   branches without confirmation, skip the confirmation prompt — but still run
   the dry run first so the script, not the agent, identifies the removal set.

3. **Run cleanup**: After the user confirms, run:

   ```bash
   "${CLAUDE_PLUGIN_ROOT}/scripts/clean-gone-branches.sh" --no-fetch
   ```

   Use `--no-fetch` after a successful dry run so cleanup acts on the same
   pruned remote-tracking state shown in the preview.

4. **Report results**: Summarize only the useful facts from the script output —
   worktrees removed, branches deleted, branches skipped and why, or that no
   cleanup was needed.

## Notes

- The script uses `git for-each-ref` instead of parsing the display layout from
  `git branch -vv`, keeping gone-branch detection stable. Plain `git branch -v`
  shows `[gone]`; `git branch -vv` adds the upstream ref, such as
  `[origin/my-branch: gone]`.
- Branches checked out in another worktree must have that worktree removed
  before the branch can be deleted. If the gone branch is checked out in the
  current worktree, the script skips it; tell the user to check out a different
  branch before cleanup can delete it.
- The script deletes branches with `git branch -D` because a gone upstream can
  leave local commits that Git would otherwise protect with `-d`; this is stale
  gone-branch cleanup the user explicitly asked for.
