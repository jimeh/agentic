# Exact worktree preservation

Read this reference when the worktree has staged, unstaged, or untracked state
that must survive a rebase, and use its collision preflight even when status is
clean because ignored objects do not appear there. The owned stash is a
transport mechanism, not the recovery copy: Git filters can alter bytes while
creating or applying a stash.

## Capture a recoverable snapshot

Resolve the repository root and change to it before collecting paths; porcelain
paths are repository-root-relative and must later be consumed from that same
root. Before this capture, establish exclusive mutation ownership of the
checkout through the eventual rebase and restoration. Pause or coordinate any
editor, watcher, hook, process, or agent that can write there. Stop if that
cannot be established. The later drift checks are defense in depth, not an
atomic lock.

Create a private durable directory outside the repository and bind its path as
`snapshot_dir` even when status is clean, because it also holds collision
observations used by the final gate. Do not place the only byte-exact recovery
copy on volatile tmpfs. For example:

```bash
snapshot_parent="${XDG_STATE_HOME:-$HOME/.local/state}/agent-rebase"
mkdir -p -- "$snapshot_parent"
chmod 0700 "$snapshot_parent"
snapshot_dir="$(mktemp -d "$snapshot_parent/snapshot.XXXXXX")"
chmod 0700 "$snapshot_dir"
```

Resolve the real Git index path with `git rev-parse --git-path index`. Before
its raw copy exists, run every Git inspection that can read the index or
worktree with `GIT_OPTIONAL_LOCKS=0`; this includes the first status used to
decide whether a snapshot is needed. Before stashing, capture:

- `git status --porcelain=v2 -z --untracked-files=all`, including both paths in
  rename records
- a raw copy of the full index and any linked shared-index dependency, plus its
  mode and hash, for rollback only
- skip-worktree and assume-unchanged flags for index entries, plus the exact
  kind, mode, and raw bytes of present flagged worktree objects
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
- a separate expected transport ledger for the stash's index, tracked-worktree,
  and untracked trees: derive the expected full index-tree OID from the captured
  raw index without filtering, while keeping the raw bytes reserved for
  rollback; derive tracked-worktree and untracked blobs through the same
  path-aware clean-filter representation Git will use
- an explicit list of paths that were absent, including tracked deletions

Use NUL-delimited path handling throughout. Keep the temporary directory private
to the current user. Verify the archive against the live filesystem before
running `git stash`; hashes detect corruption but are not themselves a recovery
copy.

## Detect predictable collisions

After fetching and pinning the base commit but before starting the rebase,
enumerate changed or materialized paths and object kinds from the
`pre_rebase_head` to immutable `base_head` transition and from each replayed
commit's parent-to-commit transition. Include every replay transition: a path
added and later deleted can still overwrite a local object while commits replay.
Do not scan every full tree for every commit. Run this preflight before creating
the owned stash. Use live `lstat` to compare candidate paths, their ancestors,
and entries beneath candidate directories with every filesystem object absent
from the current tracked tree, including untracked and ignored objects,
symlinks, status-invisible empty directories, and other structural objects. Use
`git check-ignore` to classify ignored paths, not as the only detector.

Drive the check from the candidate tree paths so a large ignored directory such
as a dependency cache is not archived or exhaustively scanned. Use NUL-delimited
path handling. Treat a file, symlink, or directory kind change as a structural
collision. Record whether a protected directory is empty; materializing any
candidate descendant beneath it is a collision even when its kind remains a
directory. Git can overwrite ignored objects without warning, so a clean status
does not make this preflight optional.

Separately enumerate index entries marked skip-worktree or assume-unchanged.
Compare each entry's worktree existence, filesystem kind, executable mode, and
path-aware clean-filtered blob with the recorded index entry. Treat absence
under assume-unchanged as hidden divergence. For skip-worktree, record absence
as the expected sparse state. If an assume-unchanged object is absent, a present
object differs, or the comparison is inconclusive, stop before stashing or
rebasing and report the flagged path; do not clear the flag or try to transport
hidden modifications. Record the flags and expected sparse absence. After the
rebase and any owned-stash restoration, verify them before deleting recovery
artifacts.

If any target or replayed tree tracks, overwrites, or populates one of those
objects, do not create the stash or start the rebase. Verify that `HEAD` still
equals `pre_rebase_head` and compare every colliding object's kind, mode, bytes,
symlink target, or emptiness with the observation captured when the collision
was detected. On success, remove only the owned external snapshot and report the
exact collision. On mismatch, retain the snapshot and report instead of deleting
recovery evidence. Leave local objects untouched.

## Create the transport stash

At the pre-stash, post-stash, and final pre-rebase gates, require
`git rev-parse HEAD` to equal `pre_rebase_head`. On mismatch, do not reset or
restore from the now-stale snapshot: retain any owned stash and recovery
artifacts, report both heads, and stop before further mutation.

After collision preflight passes, when the captured status-visible path set is
non-empty, write every path, including both rename paths and recorded deletions,
to `captured_pathspec="$snapshot_dir/status-paths.z"` inside the private
snapshot. Before recording `refs/stash` or creating the stash, recreate the
complete NUL-delimited status plus all protected ignored, untracked, symlink,
ancestor, and status-invisible object observations used by the snapshot and
collision preflight. Require exact equality. If anything changed or appeared,
remove only the owned snapshot and restart capture and collision preflight from
the new state, consuming the workflow's single total drift restart; never
combine a stale snapshot with a later worktree. Further drift at this or the
final gate means exclusive ownership was not established, so retain any evidence
still needed and stop. When the captured status-visible path set is empty and no
stash is needed, run the same comparison immediately before starting the rebase
and use that same global restart budget on drift.

After the gate passes, record the pre-existing `refs/stash`, then create one
owned stash entry with `--include-untracked`, `--pathspec-from-file`, and
`--pathspec-file-nul`. Set `GIT_LITERAL_PATHSPECS=1` for the stash command so
names containing glob characters or pathspec magic remain literal; NUL
separation alone does not disable pathspec interpretation. Scoping the stash
prevents it from removing unrelated status-invisible directories.

If the stash command fails, do not resolve or apply a supposed owned stash.
Compare the live state and `refs/stash` with the captured state. When nothing
changed, remove the owned snapshot and stop with the original dirt still live.
On any partial mutation or new stash entry, retain every recovery artifact and
stop with the exact split state. Resolve `owned_stash` only after successful
creation.

Resolve the new stash object ID and verify that it differs from the pre-existing
stash. Compare its index, tracked-worktree, and untracked trees with the
expected transport ledger, not with raw filesystem bytes: clean filters can
legitimately change tracked-worktree and untracked representation, while the
index tree must match the captured index entries verbatim. Keep the raw
filesystem archive as the recovery source; filtered stash blobs are never a
substitute. Also verify that the complete unignored porcelain status is empty
and ignored or unrelated status-invisible objects retain their preflight state.
This check must catch a same-path edit that the stash consumed after the last
live observation. A stateful or nondeterministic filter that cannot reproduce
the recorded representation is a safe-stop mismatch, not permission to weaken
the check.

If the post-stash state differs, do not apply or roll back from the stale
snapshot. Capture any new residual live state into a separate private recovery
artifact under the same durable protected `snapshot_parent`, retain it with the
owned stash and original snapshot, and stop for ownership resolution. Report
which state each artifact contains. Never pop, drop, reorder, or otherwise
disturb a pre-existing stash.

After reviewing upstream and immediately before `git rebase`, repeat the
candidate-driven protected-object and complete status comparison against the
post-stash state. Use snapshot records for captured objects now in the stash and
live `lstat` for objects that remain. On drift with an owned stash, use the same
safe stop; do not restore from a snapshot that predates the new state. Without a
stash, restart capture and collision preflight using the same single total drift
restart, then stop on any further drift because exclusive ownership was not
established. When an owned stash exists, resolve its recorded object ID again
and recompare its trees with the transport ledger before starting the rebase. If
the object is missing or corrupt, do not apply it. Restore the original index
and worktree directly from the external snapshot, run failed-restore
verification against `pre_rebase_head`, and remove the snapshot only after exact
restoration. On mismatch, retain it and report the failure. Whether restoration
succeeds or fails, report the broken owned stash object ID, current `refs/stash`
state, and whether exact owned-ref cleanup was possible. Do not alter an
ambiguous ref.

For a successful clean-worktree rebase with no owned stash, keep `snapshot_dir`
through integrated-branch verification, then remove it. Retain and report it
only when a safe-stop still needs its collision evidence.

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
Recreate any captured ancestor directory that the scoped stash removed and
restore its captured mode before comparing, but stop on an incompatible object
rather than replacing it.

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

After stash application and exact dirty-path restoration, verify flagged paths
against the current restored index. For paths still tracked, require expected
sparse paths to remain absent and compare each other worktree object's
existence, kind, executable mode, and path-aware filtered blob with its current
index entry. If the rebased tree deleted a flagged path, require its worktree
object to be absent only when it was originally absent. An originally present
flagged object may be absent or may retain its exact captured kind, mode, and
raw bytes; report either outcome and that the flag retired with the index entry.
Allow committed content to change with the rebased tree. On any content,
sparse-state, or deletion-postcondition mismatch, retain the snapshot and owned
stash, report incomplete restoration, and stop. Only when those checks pass may
a differing surviving flag be reapplied; verify it afterward. If reapplication
fails, use the same retained-evidence safe stop instead of claiming success.

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
   external snapshot. Recreate missing captured ancestor directories
   shallow-to-deep and restore their captured modes; stop rather than replace an
   incompatible object. Do not use a broad `git clean`.
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
