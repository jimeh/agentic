---
name: rebase
description: >-
  Rebase the current branch onto a requested or live upstream base, including
  intent-aware conflict resolution and optional publication of that rebase. Use
  for rebase operations, not explanation-only, merge, cherry-pick, or standalone
  force-push requests.
---

# Git Rebase

Integrate the current branch with the requested upstream branch, or the live
upstream default when none was named. Review overlapping upstream changes so the
replayed commits still fit the integrated design.

Use `why` when the request only asks why a conflict occurred. Use this skill
when resolving or continuing a rebase is part of the request. Do not guess
through a semantic conflict whose intended behavior is unsupported by repository
evidence or the user's stated goal.

Recreating commits is intrinsic to a rebase. Never push unless the user asks to
publish the result. Publishing does not by itself authorize rewriting a remote
branch; require explicit force-push authority and use `--force-with-lease`,
never `--force`.

## 1. Detect the current Git operation

Inspect status and Git's operation markers without switching the caller's
checkout.

- Stop if a merge or cherry-pick is in progress. This skill does not own those
  conflicts.
- If a rebase is already in progress, do not fetch or start another one. Resolve
  the original head and onto commit from the active rebase metadata. Inspect the
  current replayed commit and stop reason. When conflicts exist, read
  [references/conflict-resolution.md](references/conflict-resolution.md) before
  editing or staging. Before every continuation, run the collision helper with
  the original head and onto commit so objects created since the prior stop are
  protected. Continue only when the request covers the current stop, the helper
  is clear, and the required action is complete; do not skip an intentional
  `edit` or `exec`.
- Otherwise continue with the new-rebase workflow below.

## 2. Require a safe checkout

Resolve the repository root and run the remaining Git operations there. Record
the current branch and immutable `pre_rebase_head` before fetching or mutating
anything.

Establish exclusive mutation ownership of the checkout for the rebase.
Coordinate known agents, editors, hooks, formatters, or watchers that can write
into it. If a writer cannot be paused or ownership is uncertain, stop. Recheck
immediately before rebasing; any drift means ownership was not established.

Require the worktree and index to be clean, including untracked paths. Do not
create a stash, reset files, or synthesize a recovery procedure. If staged,
unstaged, untracked, conflicted, or hidden flagged state is present, stop and
ask the user to preserve or relocate it before retrying. A rebase request does
not authorize moving or rewriting unrelated local work.

Record any skip-worktree or assume-unchanged entries. Expected sparse absence is
clean; an absent assume-unchanged path, an unexpectedly materialized sparse
path, or other worktree divergence is not. Stop when the state is divergent or
cannot be established confidently. Do not clear flags to make the checkout
appear clean.

## 3. Pin and inspect the upstream base

Resolve the exact requested branch against its configured live remote. A
qualified name such as `upstream/main` selects that remote. Stop when an
unqualified name is missing or ambiguous rather than silently substituting the
default branch.

When the user did not name a base, query the remote's live default branch rather
than trusting a potentially stale local symbolic ref. Fetch the selected remote
branch, verify that `HEAD` still equals `pre_rebase_head`, and pin the fetched
commit as immutable `base_head`. Record the merge base and old local range for
later comparison.

Run the bundled `scripts/check-collisions.py` with `pre_rebase_head` and
`base_head`. It checks paths changed by the target and replay transitions,
including conservative destinations inferred from directory renames on either
side, against present ignored, untracked, symlink, and status-invisible objects
without modifying them. Exit `0` is clear, exit `2` reports collisions, and any
other result is inconclusive. Stop before rebasing on either nonzero result. Git
can overwrite ignored content without warning, so do not skip or approximate
this check.

Review upstream commits and diffs that touch the branch's files or nearby
behavior. Determine whether upstream already solved the same problem, introduced
a new source of truth, removed a dependency, or made the two implementations
compete. Use broader symbol, configuration, migration, route, or test searches
when the behavior spans files.

## 4. Rebase by intent

Immediately before rebasing, verify all of the following still match the
preflight:

- `HEAD` equals `pre_rebase_head`;
- status remains clean;
- recorded flags remain unchanged;
- the collision helper still exits `0`; and
- the live remote branch still points to `base_head`.

On drift, stop and report it. Do not reset or restore over state that appeared
after the preflight.

Rebase onto the immutable `base_head`. If conflicts occur, read
[references/conflict-resolution.md](references/conflict-resolution.md) before
editing or staging. Preserve compatible upstream and local intent. If evidence
does not support the semantic choice, leave a rebase that was already active
paused and ask. When this workflow started the rebase, abort back to
`pre_rebase_head` and verify the original clean state before asking, unless the
user explicitly requested a paused rebase.

## 5. Review the integrated branch

Compare the old and replayed commit ranges when both are available and
comparable. Otherwise use ahead/behind counts, commit lists, and targeted diffs.
Run `git diff --check` and proportionate validation for behavior affected by
upstream overlap or conflict resolution.

Confirm that the replayed commits still make sense on the new upstream design.
Adapt them during the rebase only when upstream makes the existing changes
wrong, duplicate, inconsistent, or impossible to validate. Leave optional
cleanup for follow-up work.

Before reporting success, verify that status remains clean apart from any
intentional conflict-resolution changes now committed into the rebased history,
the branch contains the expected commits, and recorded skip-worktree or
assume-unchanged flags still have their expected state.

## 6. Report and optionally publish

Report:

- the upstream ref and immutable commit used;
- overlapping upstream changes and local adaptations;
- conflict choices and their evidence;
- validation performed;
- the final branch, history, and worktree state; and
- any safe stop, unresolved uncertainty, or user action needed.

If the request also authorized publishing the rebased branch, verify the
expected remote branch and lease immediately before pushing with
`--force-with-lease`. Otherwise leave the rewritten history local.
