# Intent-aware conflict resolution

Read this reference only when a rebase is already in progress and has conflicts.
It does not apply to merge or cherry-pick conflicts.

If the request only asks why the conflict occurred, keep the investigation
read-only and use `why`. This reference owns resolution and continuation.

## Establish both sides

Start with `git status` and the unresolved paths. Identify:

- the replayed local commit, using `REBASE_HEAD`,
  `git rebase --show-current-patch`, and the rebase todo or status when needed
- the upstream commit or series that produced the conflicting design, using the
  current `HEAD`, path history, blame, and the pre-rebase upstream range

Read the full messages and diffs for both sides. Follow linked pull requests,
issues, review comments, or design records when the messages and diffs do not
establish the intended behavior. A conflict marker shows overlapping text, not
which behavior is correct.

Before editing, state each side's intent and constraints separately. Include the
behavior each side protects, relevant validation or compatibility rules, and
whether the intents are compatible.

## Choose by intent

When the intents are compatible, preserve both through the current upstream
design. For example, if upstream renamed an API and the replayed commit adds
validation, express that validation through the renamed API instead of restoring
the old API or dropping the validation.

When the intents are incompatible, select one only when commit history, linked
rationale, current repository constraints, or the user's stated goal supports
that choice. Do not invent a third behavior merely to make the text merge.

If the evidence does not support the semantic choice:

- leave the conflict intact and ask the user when continuing from a rebase that
  was already in progress
- when this workflow started the rebase, run `git rebase --abort`, then restore
  any owned stash with `git stash apply --index` and verify the full original
  snapshot before asking for the missing decision; leave it paused only when the
  user explicitly requested that state

If abort-time stash restoration conflicts or differs from the full original
snapshot, retain the owned stash and stop. Never disturb pre-existing stashes.

## Resolve and continue

Edit only the paths needed to resolve the current conflict. Check that no
conflict markers remain and inspect the combined result against both stated
intents. Stage only the resolved conflict paths with `git add -- <paths>`; do
not use broad staging commands that could absorb unrelated changes.

Confirm the remaining unmerged paths with
`git diff --name-only --diff-filter=U`. Run proportionate focused validation for
the behavior being combined. Then continue with `git rebase --continue`; do not
create an extra commit. Repeat the evidence and intent analysis for each new
conflict rather than applying the first resolution mechanically.

After the rebase completes, run the integration review from `SKILL.md`. Report
which intent each resolution preserved, any behavior deliberately dropped, the
evidence for that choice, validation results, and residual risk.

## Source

Adapted from Matt Pocock's pinned
[`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/885e2ca4d842d139e9aef4e48d366c63cb1b8013/skills/engineering/resolving-merge-conflicts/SKILL.md)
skill.
