# Exact worktree preservation

Read this reference when the worktree has staged, unstaged, or untracked state
that must survive a rebase. The owned stash is a transport mechanism, not the
recovery copy: Git filters can alter bytes while creating or applying a stash.

## Capture a recoverable snapshot

Create a private temporary directory outside the repository. Resolve the real
Git index path with `git rev-parse --git-path index`. Before stashing, capture:

- `git status --porcelain=v2 -z --untracked-files=all`, including both paths in
  rename records
- a raw copy of the index and any linked shared-index dependency, plus its mode
  and hash
- the kind, mode, existence, and path of every status-visible worktree object
- a filesystem-level archive of every present status-visible object, preserving
  regular-file bytes, executable modes, and symlink targets without invoking Git
  clean or smudge filters
- an explicit list of paths that were absent, including tracked deletions

Use NUL-delimited path handling throughout. Keep the temporary directory private
to the current user. Verify the archive against the live filesystem before
running `git stash`; hashes detect corruption but are not themselves a recovery
copy.

Record the pre-existing `refs/stash`, create one uniquely named owned stash with
`--include-untracked`, and resolve its object ID. Verify that the stash is new
and the worktree became clean. If stash creation changes or loses any captured
value, restore immediately from the external snapshot and retain every recovery
artifact until the original state verifies.

## Detect predictable collisions

After fetching the base but before starting the rebase, compare each originally
untracked path with the target tree. Check the path, its ancestors, and entries
beneath any untracked directory so file-versus-directory changes are included.

If the target base tracks or structurally collides with one of those paths, do
not start the rebase. Apply the owned stash back onto the unchanged branch,
verify the complete snapshot, drop only the stash entry whose object ID matches
the owned stash, remove the external snapshot, and report the collision.

## Restore after success

Apply only the owned stash with `git stash apply --index "$owned_stash"`, then
recreate the full snapshot. Compare status records, raw index state, object
kinds, modes, existence, regular-file bytes, and symlink targets.

When every value matches, find the stash entry whose object ID equals
`owned_stash`, drop that exact entry, and remove the external snapshot. Never
pop or reorder a pre-existing stash.

## Recover from a failed restore

If stash application fails, partially applies, conflicts, or produces any
snapshot mismatch:

1. Keep the owned stash and external snapshot.
2. Record the current rebased head object ID, then return the branch to the
   recorded `pre_rebase_head`. This rollback is part of restoring the operation
   this workflow started; use that exact ref as the target of the hard reset and
   do not target any broader ref or path set.
3. Remove only the explicitly captured worktree paths that must be replaced,
   reset tracked content to `pre_rebase_head`, restore the raw index copy, then
   restore present filesystem objects and recorded absences directly from the
   external snapshot. Do not use a broad `git clean`.
4. Recreate the full snapshot and compare every captured value.

If rollback verifies, the original branch and dirt are restored. Drop the exact
owned stash and delete the external snapshot only after that proof. If any value
still differs, stop with both recovery artifacts intact and report their paths,
the owned stash object ID, and the mismatch. Never leave the stash as the only
copy of the user's original bytes. Report the discarded rebased head object ID
even after successful rollback so the integrated result remains easy to recover.
