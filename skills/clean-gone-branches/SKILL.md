---
name: clean-gone-branches
description: >-
  Remove local branches with gone upstreams and their worktrees. Preview and
  confirm unless the user explicitly waives confirmation.
---

# Clean gone branches

Use the bundled `scripts/clean-gone-branches.sh` from the requested repository;
do not reimplement its selection or deletion logic. Resolve the script relative
to this skill directory.

Inspect `git status --short`, `git branch --show-current`,
`git rev-parse --show-toplevel`, and `git worktree list --porcelain` without
changing local work. Stay in that repository; do not use `git -C`.

## Preview and authorize

Run the script with `--dry-run`. It fetches and prunes remote refs by default;
stop if that fails, since unpruned refs can hide gone upstreams. If nothing is
eligible, report that and stop.

Use its output as the removal set. List every branch to delete in Markdown
bullets, with separate lists for worktrees to remove and branches to skip. Ask
whether to delete the listed branches unless the user already explicitly waived
confirmation. Always preview, even when confirmation was waived.

After authorization, run the script with `--no-fetch` to use the same pruned
remote-tracking state. Report removed worktrees, deleted branches, and skips
with their reasons.

## Deletion boundaries

Remove an associated worktree before deleting its branch. Skip the currently
checked-out branch and explain that the user must switch away first. The script
uses `git branch -D`, so previewed deletion can discard local commits that `-d`
would protect. Do not expand authorization beyond the requested gone-branch
cleanup.

The script uses `git for-each-ref` for stable detection rather than parsing
`git branch -vv`. In human-readable output, `-v` shows `[gone]`; `-vv` also
includes the upstream name.
