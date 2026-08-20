---
name: rebase
description: >-
  Rebase the current branch onto a specified upstream branch or the live
  upstream default, review overlap, or resolve conflicts by intent during an
  in-progress rebase. Also use when publishing the resulting rewritten history
  may require a force-push. Use why for read-only explanations of why a conflict
  occurred. Do not use this skill for merge or cherry-pick conflicts.
---

# Git Rebase

Integrate the current branch with the user-specified upstream branch, or the
live upstream default when none was named, and check whether upstream changes
undercut the branch's design. A rebase may encounter conflicts; do not promise
automatic resolution or guess through semantic ambiguity.

Use `why` for a read-only explanation of why a conflict occurred. Use this skill
when resolving or continuing the rebase is part of the request.

Recreating commits is intrinsic to a rebase. Never push unless the user
explicitly requests it. A push request does not by itself authorize rewriting a
remote branch. If the user explicitly authorizes that force-push, use
`--force-with-lease`, never `--force`.

## Workflow

### 1. Detect the active Git operation

Inspect `GIT_OPTIONAL_LOCKS=0 git status` and resolve Git's operation markers
with `git rev-parse --git-path`. Until the raw index recovery copy is captured,
or clean status establishes that none is needed, run every Git inspection that
can read the index or worktree with `GIT_OPTIONAL_LOCKS=0`; an ordinary status
can refresh and rewrite index stat-cache bytes before they are protected.

- If a merge or cherry-pick is in progress, stop. This skill does not own those
  conflicts.
- If a rebase is already in progress, do not fetch or start another rebase.
  Resolve the backend's `orig-head` and `onto` files through
  `git rev-parse --git-path`; use `ORIG_HEAD` only as a verified fallback. Bind
  `pre_rebase_head` to the original head and `base_head` to the immutable onto
  commit, then derive `pre_rebase_base` and the old-range commit count when the
  ranges are comparable. Inspect the current replayed commit and conflict state.
  If conflicts exist, read
  [references/conflict-resolution.md](references/conflict-resolution.md) before
  editing or staging anything. If no conflicts exist, identify why the rebase
  stopped and continue only when the request covers that state and its required
  action is complete; do not skip an intentional `edit` or `exec` stop.
- Otherwise, continue with the pre-rebase workflow below.

### 2. Resolve the live upstream base

Identify the current branch. If the user named a base branch, resolve that exact
branch against its configured live remote and use it. A qualified name such as
`upstream/main` selects that remote; fetch it rather than assuming `origin`.
Resolve an unqualified name only when its remote is unambiguous. Do not silently
replace it with the default branch; stop if the name is missing or ambiguous.
Bind the resolved components as `base_remote` and `base_branch` for the later
fetch and review.

When the user did not name a base, query the remote's live default branch rather
than trusting a possibly stale local `origin/HEAD`. For GitHub, use:

```bash
default_branch="$(gh repo view \
  --json defaultBranchRef \
  --jq '.defaultBranchRef.name' 2>/dev/null)" || true
if [ -z "$default_branch" ]; then
  default_branch="$(git ls-remote --symref origin HEAD 2>/dev/null |
    sed -n 's#^ref: refs/heads/\([^[:space:]]*\)[[:space:]][[:space:]]*HEAD$#\1#p')"
fi
base_remote="origin"
base_branch="$default_branch"
```

Stop and ask if `default_branch` is empty and no other base is clearly correct.

### 3. Record the rollback head and preserve status-visible dirt

Resolve the repository root and change to it before capturing paths or running
the remaining Git operations. Porcelain paths are repository-root-relative and
must not be replayed as pathspecs from a subdirectory.

```bash
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"
```

Establish exclusive mutation ownership of this checkout for the preservation,
rebase, and restoration window. Coordinate other agents and pause editors,
formatters, watchers, or hooks that can write into it. If exclusive ownership
cannot be established, stop; repeated observations cannot make the final
preflight-to-rebase transition atomic.

Record `pre_rebase_head="$(git rev-parse HEAD)"` unconditionally before
inspecting, snapshotting, or stashing dirt. Every clean-worktree path and early
exit then has the same immutable rollback target.

Read [references/worktree-preservation.md](references/worktree-preservation.md)
before the collision preflight, even when status is clean because ignored
objects are not status-visible. Always create its private `snapshot_dir` for
collision observations. If there is staged, unstaged, or untracked state, also
follow its full recovery snapshot procedure before running any stash command.
That recovery snapshot must contain a verified byte-for-byte copy, not only
hashes or Git objects: clean and smudge filters can make a stash lossy.

### 4. Fetch and record the integration ranges

Fetch the selected remote and ref, then record the exact branch head and merge
base used for review:

```bash
if git fetch "$base_remote" "$base_branch"; then
  fetch_ok=1
else
  fetch_ok=0
fi
```

If `fetch_ok` is not `1`, do not inspect or use `FETCH_HEAD`. Verify that
`pre_rebase_head` and the captured live state remain unchanged. On success,
remove the owned snapshot and stop with the original dirt live; on mismatch,
retain the snapshot and report the unexpected state.

Only after a successful fetch resolve:

```bash
current_head="$(git rev-parse HEAD)"
```

If `current_head` differs from `pre_rebase_head`, stop, retain the snapshot, and
report both heads. Do not reset or discard the foreign commit. Only after this
equality holds continue with:

```bash
base_head="$(git rev-parse 'FETCH_HEAD^{commit}')"
pre_rebase_base="$(git merge-base HEAD "$base_head")"
pre_rebase_commit_count="$(
  git rev-list --count "$pre_rebase_base".."$pre_rebase_head"
)"
```

An empty old local range is valid and must not be forced through `range-diff`
later.

Before rebasing, inspect every changed or materialized path in the
`pre_rebase_head` to `base_head` transition and in each replayed commit's
parent-to-commit transition. Compare those paths and their structural ancestors
with locally present filesystem objects absent from the current tracked tree.
Run this preflight before creating a stash so live `lstat` covers untracked and
ignored objects, symlinks, and status-invisible empty directories. Use
`git check-ignore` to classify ignored paths, not as the only detector. Treat
materializing any descendant beneath a protected empty directory as a collision
even when the ancestor remains a directory. If a transition can overwrite,
populate, or structurally collide with a local object, verify that `HEAD` and
the captured kind, mode, bytes, symlink target, or emptiness remain unchanged.
On success, remove only the owned snapshot and stop before rewriting history. On
mismatch, retain the snapshot and report instead of deleting recovery evidence.
Do not archive an arbitrarily large ignored tree or assume Git will protect it.

Also enumerate index entries marked skip-worktree or assume-unchanged. Compare
each entry's worktree existence, filesystem kind, executable mode, and
path-aware clean-filtered blob with the index. Absence under assume-unchanged is
hidden divergence; under skip-worktree, record absence as the expected sparse
state. If an assume-unchanged object is absent, a present object differs, or the
comparison is inconclusive, stop before stashing or rebasing and report the
flagged path; this workflow does not silently clear index flags or transport
hidden modifications. Record the flags and expected sparse absence. After the
rebase and any owned-stash restoration, verify them as described in step 7.

After the preflight passes, if the captured status-visible path set is
non-empty, create the owned stash entry from its NUL-delimited pathspec. Include
untracked files, but do not let an unscoped stash remove unrelated
status-invisible directories.

At the pre-stash, post-stash, and final pre-rebase gates, also require
`git rev-parse HEAD` to equal `pre_rebase_head`. On mismatch, do not reset or
restore from the now-stale snapshot: retain any owned stash and recovery
artifacts, report both heads, and stop before further mutation.

Immediately before the stash command, recreate the complete status and protected
object observations and require them to equal the captured preflight state. If
anything drifted, discard only the owned snapshot and restart capture and
collision preflight, consuming the workflow's single total drift restart.
Further drift at this or the final gate means exclusive ownership was not
established; retain any evidence still needed and stop. When the captured
status-visible path set is empty and no stash is needed, perform the same state
comparison immediately before starting the rebase and use that same global
restart budget on drift.

```bash
captured_pathspec="$snapshot_dir/status-paths.z"
preexisting_stash="$(git rev-parse -q --verify refs/stash 2>/dev/null || true)"
GIT_LITERAL_PATHSPECS=1 git stash push --include-untracked \
  --pathspec-from-file="$captured_pathspec" --pathspec-file-nul \
  -m "agent rebase: preserve working tree"
```

If the stash command fails, do not resolve or apply a supposed owned stash.
Compare the live state and `refs/stash` with the captured state. When nothing
changed, remove the owned snapshot and stop with the original dirt still live.
On any partial mutation or new stash entry, retain all recovery artifacts and
stop with the exact split state. Only after successful creation continue with:

```bash
owned_stash="$(git rev-parse --verify refs/stash)"
```

After stashing, verify that the new stash exists and is not `preexisting_stash`,
and compare its index, tracked-worktree, and untracked trees with a separately
captured expected transport ledger. Derive the expected full index-tree OID
without filtering from the captured raw index, whose bytes remain rollback-only.
Derive only the tracked-worktree and untracked expectations with the same
path-aware clean-filter representation Git uses; do not compare filtered stash
blobs with the raw recovery archive. Also verify that status has no unignored
staged, unstaged, or untracked entries and that protected ignored and
status-invisible objects are unchanged. Literal pathspec mode is required
because NUL separation alone does not disable pathspec glob or magic
interpretation.

If this post-stash check detects drift, do not restore from the now-stale
snapshot or start the rebase. Capture any new residual live state into a
separate private durable recovery artifact under the same protected
`snapshot_parent`, retain it with the owned stash and original snapshot, and
stop for ownership resolution. Report how the state is split between those
artifacts. Do not pop, drop, reorder, or otherwise disturb any pre-existing
stash.

Except for the retained-evidence safe stops above for post-stash drift or a HEAD
mismatch, do not leave the user's work silently hidden on an early exit after
creating the owned stash. If no rebase is active, restore and verify it as
described in step 7. If a rebase remains active, retain the owned stash and
report its object ID and exact recovery state.

### 5. Review incoming upstream changes

Inspect the branch's paths, then the upstream commits and diffs that touched the
same files or nearby behavior:

```bash
git diff --name-only "$pre_rebase_base"...HEAD
git log --oneline --stat "$pre_rebase_base".."$base_head" -- <paths>
git diff --name-status "$pre_rebase_base".."$base_head" -- <paths>
```

For broad behavior, also search the upstream diff for relevant feature names,
symbols, config keys, migrations, routes, and tests. Determine whether upstream
already solved the same problem, introduced a new source of truth, removed a
local dependency, or would make the two implementations compete.

### 6. Rebase

Immediately before rewriting history, repeat the complete status and
candidate-driven protected-object comparison against the post-stash state, or
the captured preflight state when no stash exists. Use snapshot records for
objects transported into the stash and live `lstat` for objects that remain. On
drift with an owned stash, follow the safe stop above rather than restoring from
a stale snapshot. Without a stash, restart capture and collision preflight using
the same single total drift restart, then stop on any further drift because
exclusive ownership was not established. When an owned stash exists, resolve
`owned_stash` again by object ID and recompare its trees with the transport
ledger so a missing or corrupt recovery object also stops the rebase. If that
object is missing or corrupt, restore the original index and worktree directly
from the external snapshot, then run failed-restore verification against
`pre_rebase_head`. Remove the snapshot only after exact restoration; otherwise
retain it and report the mismatch. Whether restoration succeeds or fails, report
the broken owned stash object ID, current `refs/stash` state, and whether an
exact owned-ref cleanup was possible. Do not apply the broken stash or alter an
ambiguous ref.

Also query `refs/heads/$base_branch` from `base_remote` again with
`git ls-remote`. If it resolves to a different commit, keep `base_head` pinned
and report the updated ref separately rather than silently changing the reviewed
target. Treat empty output as a missing remote branch. On a missing ref, query
failure, or ambiguous result, stop before rebasing. Restore and verify any owned
stash through the normal no-active-rebase early-exit path; with no stash, verify
the observed state and remove the collision snapshot. Retain recovery artifacts
only until restoration verifies, or indefinitely when it fails.

Rebase onto the immutable upstream commit recorded above:

```bash
git rebase "$base_head"
```

If conflicts occur, read
[references/conflict-resolution.md](references/conflict-resolution.md) before
editing or staging anything. Preserve compatible upstream and local intent. If
the semantic choice is not supported by evidence or the user's stated goal,
leave an already-running rebase paused and ask. When this workflow started the
rebase, abort and restore the owned stash before asking unless the user
explicitly requested a paused state.

### 7. Restore the owned stash

After a successful rebase, if this workflow created a stash, restore only that
owned stash according to
[references/worktree-preservation.md](references/worktree-preservation.md):

First compare the full tree entry at every originally status-visible tracked
path between the rebased `HEAD` and `pre_rebase_head`. At structural ancestors,
compare only existence and object kind; an ancestor directory tree ID can change
because of an unrelated sibling. If a dirty path changed or an ancestor became
structurally incompatible, do not auto-compose the hidden dirt with the new
committed tree. Record the rebased head, return to `pre_rebase_head`, restore
and verify the original full index and worktree snapshot through the reference's
failed-restore steps 2 through 4, including non-writing index inspection, then
report the overlap and recoverable rebased head for a separate user decision.

Only when those paths are unchanged, apply the owned stash:

```bash
git stash apply --index "$owned_stash"
```

Recreate and compare the dirty-path semantic snapshot after applying. Do not
compare the full raw index with its pre-rebase copy: clean entries must change
when unrelated parts of the rebased tree change. If application or exact
dirty-path verification fails, roll the branch back to `pre_rebase_head` and
restore the original full index and worktree bytes from the external recovery
copy. Retain the owned stash and recovery copy until that rollback verifies
exactly. Never leave the user's only recoverable bytes inside a stash.

After owned-stash restoration, or immediately after the rebase when no stash
exists, verify the recorded flagged paths against the current restored index.
For paths still tracked, require expected sparse paths to remain absent and
compare each other worktree object's existence, kind, executable mode, and
path-aware filtered blob with its current index entry. If the rebased tree
deleted a flagged path, require an originally absent object to remain absent. An
originally present flagged object may be absent or may retain its exact captured
kind, mode, and raw bytes; report either outcome and that the flag retired with
the index entry. Allow committed content to change with the rebased tree. On any
content, sparse-state, or deletion-postcondition mismatch, retain the snapshot
and any owned stash, report incomplete restoration, and stop. Only when those
checks pass may a differing surviving flag be reapplied; verify it afterward. If
reapplication fails, use the same retained-evidence safe stop instead of
claiming success.

### 8. Review the integrated branch

Check the new branch against upstream:

```bash
git diff --check "$base_head"...HEAD
git diff --stat "$base_head"...HEAD
git rev-list --left-right --count "$base_head"...HEAD
git log --oneline "$base_head"..HEAD
post_rebase_commit_count="$(git rev-list --count "$base_head"..HEAD)"
```

Use `git range-diff "$pre_rebase_base".."$pre_rebase_head" "$base_head"..HEAD`
only when the old head, old base, new base, and both commit counts were resolved
and the non-empty ranges describe comparable replays. This includes a rebase
that was already active when the skill started. If either range is empty,
metadata is unavailable, or the ranges are not comparable, use ahead/behind
counts, the commit list, and targeted diffs instead.

Confirm that the replayed commits still make sense on the new upstream design.
Adapt them during the rebase only when upstream makes the current changes wrong,
duplicate, inconsistent, or impossible to validate. Leave optional cleanup for
follow-up work.

After successful integration verification, when no owned stash existed, remove
the `snapshot_dir` used for collision observations. Retain and report it only
when a safe-stop still needs its evidence.

### 9. Report the result

Show the updated history and report:

- the upstream ref used
- overlapping upstream changes and any local adaptation
- conflict choices and their tradeoffs
- validation performed
- restoration of the original staged, unstaged, and untracked path semantics,
  plus the ignored-path collision preflight
- cleanup or retained location of any owned preservation snapshot
- any follow-up work or unresolved uncertainty

## Guidelines

- Keep output focused on evidence and decisions.
- Run independent read-only checks in parallel when useful.
- Resolve a semantic conflict only when commit history, linked rationale,
  current constraints, or the user's stated goal supports the choice. Leave a
  rebase that was already active paused when evidence is insufficient. Abort
  only a rebase this workflow started, unless the user explicitly requested it
  remain paused.
