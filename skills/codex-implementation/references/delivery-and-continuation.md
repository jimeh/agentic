# Delivery and continuation

Read for integrating an isolated result, cleaning up its worktree, or resuming
after integration. The parent owns Git and must preserve unrelated local work.

## Delivery

The orchestrating session owns delivery. Decide how the verified result should
land based on the work it belongs to: fold it into the checkout or branch where
a larger task is being assembled, commit it on its own branch and offer a pull
request, or hand back a patch. The delegation mechanics (worktree or not) do not
dictate the destination.

Two constraints always hold:

- Do not push, open a PR, or integrate into the user's checkout or main branch
  without the user's say-so.
- A human reviews the work before it ships; for standalone changes that usually
  means a pull request.

To apply a worktree result onto another checkout of the same repository, use the
shared object database rather than a patch. From the destination checkout:

```bash
git merge-base --is-ancestor HEAD "$BRANCH"
git merge --squash "$BRANCH"
```

The ancestry check confirms the worktree branch still builds on the destination
tip; stop and reconcile if it fails. `git merge --squash` then stages the
complete result — new files, renames, and deletions included — and commits
nothing, leaving the commit message and scope to the orchestrating session.

A patch is only needed for a genuine separate clone, which does not share the
object database:

```bash
(cd "$WORKTREE_DIR" && git add -A &&
  git diff --binary --cached HEAD) > "$ARTIFACT_DIR/change.patch"
git apply "$ARTIFACT_DIR/change.patch"
```

Staging inside the source checkout is required so newly created files are
included in the patch; `git diff HEAD` alone would drop them.

## Cleanup

Once the result is delivered (or the work is abandoned), remove the throwaway
checkout so worktrees and branches do not accumulate:

```bash
git worktree remove "$WORKTREE_DIR"
rm -rf "$WORKTREE_PARENT" "$ARTIFACT_DIR"
```

Delete the local `codex/<slug>` branch once its result is integrated or
rejected. A squash integration leaves it unmerged as far as Git is concerned, so
that needs `git branch -D`. Keep the branch while a PR based on it is still
open.

## Iteration

Follow-up fixes are cheaper through the same Codex session than a fresh
zero-context run, and keep the context Codex already built. Read the session ID
from the previous successful run's `run.json` (the `jq -e` form fails instead of
yielding `null` when the field is missing), write the follow-up prompt to a
fresh file, and resume with a fresh artifact directory:

```bash
SESSION_ID="$(jq -er '.sessionId | select(type == "string" and length > 0)' \
  "$ARTIFACT_DIR/run.json")"
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-implementation.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

(cd "$WORKTREE_DIR" && codex-headless \
  --artifact-dir "$NEXT_ARTIFACT_DIR" \
  --sandbox workspace-write \
  --resume "$SESSION_ID" \
  < "$NEXT_PROMPT")
```

When a previous round was already integrated into the destination, start the
next round from the integrated state, including any adjustment made during
review. Do this yourself, before re-prompting, and only after capturing the
previous round:

```bash
(cd "$WORKTREE_DIR" && git reset --hard <destination-branch>)
```

Before resetting, confirm all worker changes are captured and integrated and the
throwaway checkout contains no unrelated or uncommitted work. It keeps every
round a plain `git merge --squash` from the destination checkout, and removes
any need to track which commits were already integrated. Do not reset before a
round whose predecessor has not been integrated; the target would still be the
pre-implementation tip, and the reset would discard the work being corrected.

The follow-up prompt states only what is wrong, the revision boundary, and what
proof is expected. If repeated attempts make no progress, reassess the approach
or take the work back into the parent. Honor explicit user budgets.
