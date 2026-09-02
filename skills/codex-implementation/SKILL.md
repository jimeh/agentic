---
name: codex-implementation
description: >-
  Delegate bounded, well-specified implementation work to the Codex CLI, then
  inspect, verify, and deliver the result as Claude. Not for planning,
  architecture, ambiguous requirements, or product and UX decisions.
---

# Codex Implementation

Use Codex as a bounded implementation agent. Claude keeps ownership of planning,
architecture, decomposition, validation, integration, and user communication.

Do not hand Codex an entire project or vague feature. Split the work first.

## Delegation Checklist

Use Codex when nearly all answers are yes:

1. Is the scope clearly bounded?
2. Is there a concrete success criterion?
3. Can the work be completed without architecture, product, API, or UX
   decisions?
4. Can the result be independently reviewed?
5. Would an isolated worktree reduce conflict or risk?

If not, retain the work, decompose it further, or use a planning/review skill
first.

Good candidates:

- Implementing an approved plan
- Straightforward refactors
- Migrations
- Adding tests
- Implementing a documented API
- Fixing a well-understood bug
- Repetitive edits or pattern conversions
- Updating generated or mechanical code

Bad candidates:

- Architecture or API design
- UX or product decisions
- Unclear failures
- Exploratory work
- Ambiguous requirements
- Broad features with unknown scope

## Workflow

1. Inspect the current state with `git status --short`.
2. Define the task: objective, constraints, files if known, success criteria,
   and verification.
3. Use an isolated worktree for non-trivial edits, risky edits, or parallel
   work.
4. Create a temporary artifact directory for the prompt and run artifacts.
5. Write a concise prompt.
6. Run `codex-headless` with a workspace-write sandbox from the intended
   checkout.
7. Inspect `git status`, `git diff`, and the diff since the recorded starting
   tip. Codex may have committed on its own, which leaves the first two empty
   while the branch has moved.
8. Run or check focused verification yourself.
9. For non-trivial changes, review the complete result yourself as an
   independent reviewer before treating the work as complete — uncommitted
   changes and anything committed since the starting tip — and judge it like a
   contributor PR. A review that inspected only the working tree passes
   vacuously when Codex committed its work. Do not route the diff to
   `codex-review`: gpt-5.6-sol re-reviewing its own output is weak independence.
   For substantial diffs, also get a fresh Claude subagent review; the
   orchestrating session wrote the spec and is not fully neutral. This gate is
   mandatory; adjust or reject the result based on what it finds.
10. Deliver the result (see Delivery below).
11. Report what changed, what was verified, and what remains.

## Isolation

Use isolated work when practical:

- Create a dedicated worktree and branch for substantial or parallel tasks.
- Keep Codex away from unrelated user changes.
- Ask Codex to leave Git alone and report what it did. Claude owns every Git
  operation, including committing Codex's work in the worktree it ran in.
  Depending on Codex to commit is what makes uncommitted work vanish silently
  during later integration.
- Do not let multiple implementation agents edit the same checkout.

Use the current checkout only for small, low-risk edits where isolation adds
more overhead than value.

## Isolated Worktree Command Shape

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-implementation.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
```

Create a throwaway worktree from the current `HEAD`:

```bash
TASK_SLUG="<short-task-slug>"
WORKTREE_PARENT="$(mktemp -d "${TMPDIR:-/tmp}/codex-worktree.XXXXXX")"
WORKTREE_DIR="$WORKTREE_PARENT/worktree"
BRANCH="codex/$TASK_SLUG"
START_TIP="$(git rev-parse HEAD)"

git worktree add -b "$BRANCH" "$WORKTREE_DIR" HEAD
```

Keep `START_TIP`. It is what makes the result reviewable no matter how Codex
left it — working tree, commits, or both.

Run Codex in that worktree:

```bash
(cd "$WORKTREE_DIR" && codex-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --sandbox workspace-write \
  -- --add-dir "$ARTIFACT_DIR" \
  < "$PROMPT")
```

The runner always runs Codex from the current directory, so `cd` into the target
checkout. Codex options such as `--add-dir` go after `--`; the runner owns the
sandbox, model, effort, session, and output flags.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Codex diagnostics to `stderr.log`, the final report
to `result.md`, and run state including the session ID to `run.json`. For long
tasks, run in the background and tail `progress.log` for liveness; read
`result.md` and `run.json` when the run exits, and open `events.ndjson` only to
diagnose transport or model behavior. Do not kill quiet runs prematurely; the
heartbeat line confirms the process is alive.

Parallel independent tasks are fine: separate worktrees, separate artifact
directories.

After Codex finishes, inspect the result from the worktree:

```bash
cd "$WORKTREE_DIR"
git status --short
git diff
git diff "$START_TIP" HEAD   # anything Codex committed on its own
```

The last command is not optional. If Codex committed, the first two are empty
and a review that stops there inspects nothing at all.

Account for every path the status reports. Codex's report explains most of them;
the rest are suspect. Delete strays, or add genuine build artifacts to
`.gitignore` where the repository should have been ignoring them anyway, and ask
Codex about anything still ambiguous. Fix the worktree rather than the staging
set, so the sweep below stays safe to run blind and later resets cannot leave a
stray behind — `git reset --hard` discards tracked modifications but leaves
untracked files in place.

For branch-based delivery, capture the result yourself once it looks right:

```bash
git add -A && git commit -m "codex: <slug>"
```

The message is throwaway if the destination squashes it. Nothing to commit is a
valid outcome when Codex committed on its own — the branch tip is what matters,
not who wrote it — but only once the diff against `START_TIP` has actually been
reviewed.

If the implementation depends on uncommitted work in the original checkout,
either keep the task in the current checkout or explicitly transfer only the
needed patch/context into the worktree. Do not accidentally copy unrelated user
changes.

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

## Current Checkout Command Shape

Use this only for small, low-risk edits:

```bash
codex-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --sandbox workspace-write \
  -- --add-dir "$ARTIFACT_DIR" \
  < "$PROMPT"
```

Use `--sandbox danger-full-access` only when the implementation truly needs
machine-level access such as simulator control, app automation, package-manager
global state, or files outside the workspace.

## Iteration

Follow-up fixes are cheaper through the same Codex session than a fresh
zero-context run, and keep the context Codex already built. Read the session ID
from the previous run's `run.json`, then resume it with a fresh artifact
directory:

```bash
SESSION_ID="$(jq -r .sessionId "$ARTIFACT_DIR/run.json")"
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-implementation.XXXXXX")"

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

The reset is safe because you committed Codex's work rather than relying on it
to do so. It keeps every round a plain `git merge --squash` from the destination
checkout, and removes any need to track which commits were already integrated.
Do not reset before a round whose predecessor has not been integrated; the
target would still be the pre-implementation tip, and the reset would discard
the work being corrected.

Write the follow-up prompt to a fresh file first; state only what is wrong and
what proof is expected. If two resume rounds fail to fix the problem, stop
delegating and make the fix directly.

## Prompting Strategy

Prompts should be short and operational. Include only what changes the outcome:
objective, constraints, known files, and success criteria. Avoid large context
dumps and architecture essays.

Use this shape:

```text
Implement this scoped change.

Repository: <absolute repo path>
Objective: <one sentence>

Constraints:
- <public APIs unchanged | do not alter behavior | preserve user changes>
- Do not commit, push, deploy, or edit global config.
- Stop if architecture, API, UX, or product decisions are required.

Files to inspect first:
- <paths if known>

Success criteria:
- <observable behavior or testable outcome>

Verification:
- Run <focused command>, or explain why it cannot run.

Report:
- Summary
- Files changed
- Important decisions
- Assumptions
- Verification run and result
- Limitations or suggested follow-up
```

Examples:

```text
Implement the approved plan for the authentication middleware.
Keep public APIs unchanged. Add tests. Return when complete.
```

```text
Refactor the cache implementation to remove duplicate logic.
Do not change behavior. Update tests if required. Return a summary of changes.
```

## Scope Control

- If the task grows beyond the original scope, stop and recommend a split.
- If architectural issues appear, return them to Claude. Do not redesign the
  system independently.
- If requirements are missing, report the gap and recommended next step.
- If repeated failures happen, explain the blocker. Do not retry the same
  approach indefinitely.
- Preserve unrelated user changes.

## Reporting Back

After Codex finishes, Claude must inspect the result before presenting it.

Report:

- What Codex changed
- Files changed
- Verification run and result
- Any Claude adjustments after review
- Assumptions, limitations, or follow-up work

If Codex was blocked, report why, what information is missing, and the next
recommended step.
