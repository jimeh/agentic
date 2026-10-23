# Integration

Read before moving an isolated result into its destination, cleaning up its
worktree, or starting a later round. The inline rules in `SKILL.md` still hold.

## Capture

Commit the worker's complete result on its throwaway branch, inside the worktree
it ran in, before anything else:

```bash
(cd "$WORKTREE_DIR" && git add -A && git commit -m "<task summary>")
```

Then confirm the branch still builds on the destination. From the destination
checkout:

```bash
git merge-base --is-ancestor "$START_TIP" "$BRANCH"
git merge-base --is-ancestor HEAD "$BRANCH"
```

When the second check fails because the destination advanced, rebase the
throwaway branch onto the destination head in its worktree and re-verify before
integrating.

## Integrate

With authority to integrate into the destination checkout, stage the complete
result from the shared object database:

```bash
git merge --squash "$BRANCH"
```

It stages new files, renames, and deletions, and commits nothing. It aborts when
the destination already has staged changes, so check the index first. Commit the
staged result only with commit authority, through `commit`; without it, the
result stays staged for the user, and the next round must not realign to the
destination.

A separate clone does not share the object database. Hand over a patch made from
the captured branch instead:

```bash
(cd "$WORKTREE_DIR" && git diff --binary "$START_TIP" HEAD) > change.patch
git apply change.patch
```

## Capture Without Commit Authority in a Shared Checkout

To snapshot shared-checkout work for destructive validation or hand-over without
committing and without touching the real index, use a temporary index limited to
the feature's paths:

```bash
TMP_INDEX="$(mktemp)"
cp "$(git rev-parse --git-path index)" "$TMP_INDEX"
GIT_INDEX_FILE="$TMP_INDEX" git add -A -- <feature paths>
GIT_INDEX_FILE="$TMP_INDEX" git diff --binary --cached HEAD -- <feature paths> \
  > change.patch
rm -f "$TMP_INDEX"
```

Never run `git add -A` against the real index of a shared checkout; it stages
the user's unrelated changes.

## Realign for a Later Round

When the previous round is committed on the destination, start the next round
from that state, including any adjustment made during review:

```bash
(cd "$WORKTREE_DIR" && git reset --hard <destination-branch>)
```

Reset only after confirming the worktree holds no uncaptured or unrelated work.
Each round then integrates with a plain `git merge --squash`. When the previous
round is still staged or otherwise uncommitted on the destination, keep the
worktree as it is and correct on top of it; a reset would discard the work being
corrected.

## Clean Up

Once the result is delivered or abandoned:

```bash
git worktree remove "$WORKTREE_DIR"
rm -rf "$WORKTREE_PARENT"
git branch -D "$BRANCH"
```

A squash integration leaves the throwaway branch unmerged in Git's view, so
deleting it needs `-D`. Keep the branch while a pull request based on it is
open.
