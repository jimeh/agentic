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

Use `GIT_OPTIONAL_LOCKS=0` for every pre-apply Git inspection of the original
checkout that can refresh its index. Read-only preflight and safe stops must not
change the caller's index merely by observing it.

Inspect status and Git's operation markers without switching the caller's
checkout.

- Stop if a merge or cherry-pick is in progress. This skill does not own those
  conflicts.
- If a rebase is already in progress, do not fetch or start another one. Resolve
  the original head and onto commit from the active rebase metadata. Inspect the
  current replayed commit and stop reason. When conflicts exist, read
  [references/conflict-resolution.md](references/conflict-resolution.md) before
  editing or staging. Continue an in-place rebase only after proving the
  checkout contains no untracked, ignored, or status-invisible objects that Git
  could overwrite. If absence cannot be established, stop and offer to abort and
  restart through the isolated workflow below. Do not skip an intentional `edit`
  or `exec`.
- Otherwise continue with the new-rebase workflow below.

## 2. Require a safe checkout

Resolve the repository root and run the remaining Git operations there. Record
the current named branch and immutable `pre_rebase_head` before fetching or
mutating anything. Stop on a detached checkout.

Establish exclusive mutation ownership of the checkout for the rebase.
Coordinate known agents, editors, hooks, formatters, or watchers that can write
into it. If a writer cannot be paused or ownership is uncertain, stop. Recheck
immediately before rebasing; any drift means ownership was not established.

Require the worktree and index to be clean, including untracked paths. Do not
create a stash or mutate the original checkout to manufacture that condition. If
staged, unstaged, untracked, conflicted, or hidden flagged state is present,
stop and ask the user to preserve or relocate it before retrying. A rebase
request does not authorize moving or rewriting unrelated local work.

Record any skip-worktree or assume-unchanged entries and their exact filesystem
state. Expected sparse absence is clean; an absent assume-unchanged path, an
unexpectedly materialized sparse path, or other worktree divergence is not. Stop
when the state is divergent or cannot be established confidently. Do not clear
flags to make the checkout appear clean.

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

Review upstream commits and diffs that touch the branch's files or nearby
behavior. Determine whether upstream already solved the same problem, introduced
a new source of truth, removed a dependency, or made the two implementations
compete. Use broader symbol, configuration, migration, route, or test searches
when the behavior spans files.

## 4. Rebase in isolation

Create an owned, private temporary worktree outside the repository and detach it
at `pre_rebase_head`. Perform the rebase there, not in the caller's checkout.
This lets Git materialize inferred and conflict paths without touching local
ignored or status-invisible objects.

Rebase the isolated worktree onto `base_head`. If conflicts occur, read
[references/conflict-resolution.md](references/conflict-resolution.md) before
editing or staging. Preserve compatible upstream and local intent. If evidence
does not support the semantic choice, abort and remove the owned isolated
worktree before asking; retain it only when the user explicitly requested a
paused rebase. The original checkout must remain unchanged.

Capture the isolated `candidate_head`, compare the old and replayed ranges, and
run proportionate validation there. Confirm that the replayed commits still fit
the upstream design before changing the original branch. Adapt them during the
rebase only when upstream makes the existing changes wrong, duplicate,
inconsistent, or impossible to validate; leave optional cleanup for follow-up.

## 5. Apply the exact candidate

Immediately before applying the candidate, verify all of the following still
match the preflight in the original checkout:

- `HEAD` equals `pre_rebase_head`;
- the current branch equals the recorded branch;
- status remains clean;
- each recorded flagged path still has the same presence, filesystem kind,
  executable mode, raw content, and flag bits;
- the live remote branch still points to `base_head`.

On drift, stop and report it. Do not reset or restore over state that appeared
after the preflight. Remove the owned isolated worktree before reporting unless
it contains conflict-resolution state needed for a paused user decision; when
retained, report its exact path.

Run `scripts/check-collisions.py` in the original checkout with
`pre_rebase_head`, `candidate_head`, and the recorded branch name. It binds the
checkout identity and compares the exact candidate tree to present ignored,
untracked, symlink, and status-invisible objects. Exit `0` is clear, exit `2`
reports collisions, and any other result is inconclusive. Stop without changing
the original checkout on either nonzero result. Apply the same isolated-worktree
cleanup and reporting rule used for pre-apply drift.

With exclusive mutation ownership still established, treat the final reset and
flag restoration as one guarded apply. Advance the current branch and tracked
worktree to `candidate_head` with `git reset --hard "$candidate_head"`, then
immediately reapply recorded flags to surviving entries. After flag
reapplication, remove a reset-materialized path only when the exact preflight
proves it was absent. Keep candidate content for paths recorded as present;
never restore old tracked content over a candidate change. The reset applies the
already-authorized rebase only after a clean-state and exact-tree proof; it is
not authority to discard dirt. If the reset or flagged-state restoration fails,
retain the isolated worktree and report the state instead of improvising
recovery.

Verify the original checkout now matches the validated candidate, status and
recorded flags remain expected, and unrelated local objects remain present. Then
remove the owned temporary worktree.

## 6. Review the integrated branch

Use the isolated range comparison and validation as evidence. Rerun only checks
whose result depends on the original checkout rather than the candidate commit.

Before reporting success, verify that status remains clean apart from any
intentional conflict-resolution changes now committed into the rebased history,
the branch contains the expected commits, and recorded skip-worktree or
assume-unchanged flags still have their expected state.

## 7. Report and optionally publish

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
