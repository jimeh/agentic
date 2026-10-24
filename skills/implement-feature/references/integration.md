# Integration

Read before moving an isolated result into its destination, capturing
shared-checkout work, cleaning up a worktree, or starting a later round. The
inline rules in `SKILL.md` still hold.

Decide where the verified result lands from the work it belongs to: the checkout
where a larger task is being assembled, its own branch offered as a pull
request, or a patch handed back. How the worker ran does not decide the
destination. Keep patches and other artifacts in a private temporary directory,
never in the destination checkout:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/impl-integration.XXXXXX")"
```

## Capture Each Round

Commit the worker's complete result on its throwaway branch, inside the worktree
it ran in, and record the capture:

```bash
(cd "$WORKTREE_DIR" && git add -A && git commit -m "<round summary>")
ROUND_TIP="$(git -C "$WORKTREE_DIR" rev-parse HEAD)"
```

When you moved scoped uncommitted input into the worktree, it is already its own
commit; integrate only the worker's commits after it, using that commit in place
of `START_TIP` below.

Confirm the branch still builds on the destination. From the destination
checkout:

```bash
git merge-base --is-ancestor "$START_TIP" "$BRANCH"
git merge-base --is-ancestor HEAD "$BRANCH"
```

When the second check fails because the destination advanced, rebase the
throwaway branch onto the destination head in its worktree and re-verify before
integrating.

## Integrate the First Round

Squash staging does not protect existing staged work: on a fast-forward it
succeeds and mixes the result with whatever is already staged. Require a clean
index first, and stop and ask when it is not:

```bash
git diff --cached --quiet
git merge --squash "$BRANCH"
```

This stages new files, renames, and deletions, and commits nothing. Unstaged
changes outside the result stay as they were. Commit the staged result only with
commit authority, through `commit`.

A separate clone does not share the object database. Hand over a patch from the
captured branch instead:

```bash
git -C "$WORKTREE_DIR" diff --binary "$START_TIP" "$ROUND_TIP" \
  > "$ARTIFACT_DIR/change.patch"
git apply --index "$ARTIFACT_DIR/change.patch"
```

## Integrate a Later Round

When the previous round is committed on the destination, realign the worktree to
it before the worker continues, so each round is a plain squash:

```bash
(cd "$WORKTREE_DIR" && git reset --hard <destination-branch>)
```

Reset only after confirming the worktree holds no uncaptured or unrelated work.

When the previous round is still staged and uncommitted on the destination, do
not reset; the target would be the pre-implementation tip, which discards the
work being corrected. Let the worker continue in the same worktree, capture the
new round, and apply only its delta on top of the staged result:

```bash
git -C "$WORKTREE_DIR" diff --binary "$PREV_ROUND_TIP" "$ROUND_TIP" \
  > "$ARTIFACT_DIR/round.patch"
git apply --index "$ARTIFACT_DIR/round.patch"
```

A second squash would fail here, because the staged first round would be
overwritten. When the delta does not apply cleanly, retry with `--3way`, and
stop and report if it still conflicts.

## Capture Shared-Checkout Work Without Committing

To snapshot shared-checkout work for destructive validation or hand-over without
committing and without touching the real index, use a temporary index limited to
the feature's paths:

```bash
TMP_INDEX="$(mktemp)"
cp "$(git rev-parse --git-path index)" "$TMP_INDEX"
GIT_INDEX_FILE="$TMP_INDEX" git add -A -- <feature paths>
GIT_INDEX_FILE="$TMP_INDEX" git diff --binary --cached HEAD -- <feature paths> \
  > "$ARTIFACT_DIR/change.patch"
rm -f "$TMP_INDEX"
```

Never run `git add -A` against the real index of a shared checkout; it stages
the user's unrelated changes.

## Clean Up

Once the result is delivered or abandoned:

```bash
git worktree remove "$WORKTREE_DIR"
rm -rf "$WORKTREE_PARENT" "$ARTIFACT_DIR"
git branch -D "$BRANCH"
```

A squash integration leaves the throwaway branch unmerged in Git's view, so
deleting it needs `-D`. Keep the branch while a pull request based on it is
open.
