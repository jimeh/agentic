# Exact worktree preservation

Read this reference when the worktree has staged, unstaged, or untracked state
that must survive a rebase, and use its collision preflight even when status is
clean because ignored objects do not appear there. The owned stash is a
transport mechanism, not the recovery copy: Git filters can alter bytes while
creating or applying a stash.

## Capture a recoverable snapshot

Create a private temporary directory outside the repository. Resolve the real
Git index path with `git rev-parse --git-path index`. Before its raw copy
exists, run every Git inspection that can read the index or worktree with
`GIT_OPTIONAL_LOCKS=0`; this includes the first status used to decide whether a
snapshot is needed. Before stashing, capture:

- `git status --porcelain=v2 -z --untracked-files=all`, including both paths in
  rename records
- a raw copy of the full index and any linked shared-index dependency, plus its
  mode and hash, for rollback only
- for every status-visible path, whether its original index entry was staged
  relative to `pre_rebase_head`, plus its stage, mode, and blob entry when one
  existed
- the kind, mode, existence, and path of every status-visible worktree object
- the kind and mode of every filesystem ancestor below the repository root for
  each status-visible object, including untracked parent directories that a
  stash can remove and recreate
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

After fetching the base but before starting the rebase, enumerate changed or
materialized paths and object kinds from the `pre_rebase_head` to `base`
transition and from each replayed commit's parent-to-commit transition. Include
every replay transition: a path added and later deleted can still overwrite a
local object while commits replay. Do not scan every full tree for every commit.
Use `lstat` to compare the candidate paths, their ancestors, and entries beneath
candidate directories with every locally present object absent from the current
tracked tree, including:

- status-visible untracked paths;
- present ignored objects, classified with `git check-ignore`; and
- status-invisible empty directories or other structural objects.

Drive the check from the candidate tree paths so a large ignored directory such
as a dependency cache is not archived or exhaustively scanned. Use NUL-delimited
path handling. Treat a file, symlink, or directory kind change as a structural
collision. Git can overwrite ignored objects without warning, so a clean status
does not make this preflight optional.

If any target or replayed tree tracks, overwrites, or structurally collides with
one of those objects, do not start the rebase. Apply any owned stash back onto
the unchanged branch and verify the complete original snapshot. When status was
clean and no snapshot or stash exists, verify that `HEAD` still equals
`pre_rebase_head` and compare every colliding object's kind, mode, bytes, or
symlink target with the observation captured when the collision was detected.
Drop only an owned stash entry whose object ID matches `owned_stash`, remove
only owned recovery artifacts, and report the exact collision. Leave local
objects untouched.

## Restore after success

Before applying the stash, compare the full tree entry at every originally
status-visible tracked path between `pre_rebase_head` and the rebased `HEAD`.
This includes both sides of renames and recorded deletions. At each structural
ancestor, compare only existence and object kind: a directory tree ID or content
can legitimately change because of an unrelated sibling.

If any differ, do not ask Git to merge the user's hidden dirt into a changed
committed path. Record the rebased head, return the branch to `pre_rebase_head`,
restore the original raw index and filesystem snapshot, and verify the full
original state by following steps 2 through 4 under **Recover from a failed
restore**, including its non-writing index verification. Retain the rebased head
object ID in the report so the integration result is recoverable, then ask for a
separate decision about the overlap. Drop the owned stash and external snapshot
only after exact rollback verification; leave them intact on any mismatch.

When every dirty tracked path is unchanged by the rebase, apply only the owned
stash with `git stash apply --index "$owned_stash"`, then recreate the
dirty-path snapshot. The full raw index copy is rollback material, not a success
oracle: unrelated clean entries legitimately change during a successful rebase.

For successful restoration, verify:

- no unexpected staged, unstaged, or untracked paths appeared;
- every originally status-visible tracked path retains its captured index
  stages, modes, and blob entries;
- every originally present status-visible filesystem object, including a
  staged-only path, retains its exact kind, mode, regular-file bytes, or symlink
  target;
- every captured filesystem ancestor retains its exact kind and mode;
- mixed staged-and-unstaged paths satisfy both exact checks;
- originally untracked objects remain absent from the index with their exact
  filesystem state; and
- recorded deletions remain absent in the worktree and retain their captured
  staged or unstaged index state.

Compare the captured per-path evidence rather than the full raw index. Because
the overlap gate established that every dirty tracked path has the same
committed baseline, exact path-level equality is both meaningful and required;
changes elsewhere in the clean index are expected.

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
4. Hash the restored raw index before running another Git inspection, then
   recreate the original full snapshot and compare the raw index, status
   records, and every captured filesystem value. Run every verification command
   that reads the worktree or index with `GIT_OPTIONAL_LOCKS=0` so stat-cache
   refreshes cannot rewrite the index being verified. Confirm the raw index hash
   again at the end. Full-index equality is valid here because the branch is
   back at `pre_rebase_head`.

If rollback verifies, the original branch and dirt are restored. Drop the exact
owned stash and delete the external snapshot only after that proof. If any value
still differs, stop with both recovery artifacts intact and report their paths,
the owned stash object ID, and the mismatch. Never leave the stash as the only
copy of the user's original bytes. Report the discarded rebased head object ID
even after successful rollback so the integrated result remains easy to recover.
