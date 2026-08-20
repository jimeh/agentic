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
  `pre_rebase_head` to the original head and `base` to the onto commit, then
  derive `pre_rebase_base` and the old-range commit count when the ranges are
  comparable. Inspect the current replayed commit and conflict state. If
  conflicts exist, read
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
Bind the resolved components as `base_remote`, `base_branch`, and
`base="$base_remote/$base_branch"` for the later fetch and review.

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
base="$base_remote/$base_branch"
```

Stop and ask if `default_branch` is empty and no other base is clearly correct.

### 3. Record the rollback head and preserve status-visible dirt

Record `pre_rebase_head="$(git rev-parse HEAD)"` unconditionally before
inspecting, snapshotting, or stashing dirt. Every clean-worktree path and early
exit then has the same immutable rollback target.

Read [references/worktree-preservation.md](references/worktree-preservation.md)
before the collision preflight, even when status is clean because ignored
objects are not status-visible. If there is staged, unstaged, or untracked
state, follow its snapshot procedure before running any stash command. The
external snapshot must contain a verified byte-for-byte recovery copy, not only
hashes or Git objects: clean and smudge filters can make a stash lossy.

If the snapshot is non-empty, record the existing `refs/stash`, then create one
uniquely named owned stash that includes untracked files:

```bash
preexisting_stash="$(git rev-parse -q --verify refs/stash 2>/dev/null || true)"
git stash push --include-untracked -m "agent rebase: preserve working tree"
owned_stash="$(git rev-parse --verify refs/stash)"
```

Verify that the new stash exists and is not `preexisting_stash`. Stop if the
stash failed or the worktree did not become clean. Do not pop, drop, reorder, or
otherwise disturb any pre-existing stash.

After creating the owned stash, do not leave the user's work silently hidden on
an early exit. If no rebase is active, restore and verify it as described in
step 7. If a rebase remains active, retain the owned stash and report its object
ID and the exact recovery state.

### 4. Fetch and record the integration ranges

Fetch the selected remote and ref, then record the exact branch head and merge
base used for review:

```bash
git fetch "$base_remote" "$base_branch"
test "$(git rev-parse HEAD)" = "$pre_rebase_head"
pre_rebase_base="$(git merge-base HEAD "$base")"
pre_rebase_commit_count="$(
  git rev-list --count "$pre_rebase_base".."$pre_rebase_head"
)"
```

An empty old local range is valid and must not be forced through `range-diff`
later.

Before rebasing, inspect every changed or materialized path in the
`pre_rebase_head` to `base` transition and in each replayed commit's
parent-to-commit transition. Compare those paths and their structural ancestors
with locally present filesystem objects absent from the current tracked tree.
Use `lstat` so ignored objects, symlinks, and status-invisible empty directories
are included; use `git check-ignore` to classify ignored paths, not as the only
detector. If any transition can overwrite or structurally collide with a local
object, restore any owned stash on the unchanged branch and verify its original
snapshot. When no snapshot was needed, verify that `HEAD` and the captured kind,
mode, bytes, or symlink target of each colliding object remain unchanged. Clean
up only owned recovery artifacts, then stop before rewriting history. Do not
archive an arbitrarily large ignored tree or assume Git will protect it.

### 5. Review incoming upstream changes

Inspect the branch's paths, then the upstream commits and diffs that touched the
same files or nearby behavior:

```bash
git diff --name-only "$pre_rebase_base"...HEAD
git log --oneline --stat "$pre_rebase_base".."$base" -- <paths>
git diff --name-status "$pre_rebase_base".."$base" -- <paths>
```

For broad behavior, also search the upstream diff for relevant feature names,
symbols, config keys, migrations, routes, and tests. Determine whether upstream
already solved the same problem, introduced a new source of truth, removed a
local dependency, or would make the two implementations compete.

### 6. Rebase

Rebase onto the full upstream ref recorded above:

```bash
git rebase "$base"
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

### 8. Review the integrated branch

Check the new branch against upstream:

```bash
git diff --check "$base"...HEAD
git diff --stat "$base"...HEAD
git rev-list --left-right --count "$base"...HEAD
git log --oneline "$base"..HEAD
post_rebase_commit_count="$(git rev-list --count "$base"..HEAD)"
```

Use `git range-diff "$pre_rebase_base".."$pre_rebase_head" "$base"..HEAD` only
when the old head, old base, new base, and both commit counts were resolved and
the non-empty ranges describe comparable replays. This includes a rebase that
was already active when the skill started. If either range is empty, metadata is
unavailable, or the ranges are not comparable, use ahead/behind counts, the
commit list, and targeted diffs instead.

Confirm that the replayed commits still make sense on the new upstream design.
Adapt them during the rebase only when upstream makes the current changes wrong,
duplicate, inconsistent, or impossible to validate. Leave optional cleanup for
follow-up work.

### 9. Report the result

Show the updated history and report:

- the upstream ref used
- overlapping upstream changes and any local adaptation
- conflict choices and their tradeoffs
- validation performed
- restoration of the original staged, unstaged, and untracked path semantics,
  plus the ignored-path collision preflight
- any follow-up work or unresolved uncertainty

## Guidelines

- Keep output focused on evidence and decisions.
- Run independent read-only checks in parallel when useful.
- Resolve a semantic conflict only when commit history, linked rationale,
  current constraints, or the user's stated goal supports the choice. Leave a
  rebase that was already active paused when evidence is insufficient. Abort
  only a rebase this workflow started, unless the user explicitly requested it
  remain paused.
