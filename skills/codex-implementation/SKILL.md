---
name: codex-implementation
description: >-
  Execute settled implementation tasks through Codex CLI when a separate
  worker is selected. The parent owns scope, verification, and delivery.
---

# Codex Implementation

Use Codex as a bounded implementation agent. The parent keeps ownership of
planning, architecture, decomposition, validation, integration, and user
communication.

Do not hand Codex an entire project or vague feature. Split the work first.

## Worker boundary

The parent chooses whether delegation is needed. Prefer a native worker with no
inherited history when it satisfies the task; use this CLI for explicit
selection or isolation and continuation needs. Start initial sessions fresh,
with a brief containing objective, paths or revisions, constraints, allowed
actions, expected output, and verification. Do not paste parent histories.

Include this instruction in every worker prompt: "Perform this task directly. Do
not invoke delegation skills or launch model workers through native tools or
CLIs unless the parent explicitly authorizes that structure." Resume the same
worker for relevant follow-ups; start fresh when its task context no longer
fits.

Delegate only settled work with observable success criteria. Keep architecture,
API, product, and UX decisions in the parent. Decompose ambiguous work first.

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
   vacuously when Codex committed its work. Use review-code when a review is
   requested or required by the owning workflow; do not add reviewers merely
   because implementation was delegated.
10. Deliver the result (see Delivery below).
11. Report what changed, what was verified, and what remains.

## Isolation

Use isolated work when practical:

- Create a dedicated worktree and branch for substantial or parallel tasks.
- Keep Codex away from unrelated user changes.
- Ask Codex to leave Git alone and report what it did. The parent owns every Git
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

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md`. Exit 65 means the stream
carried malformed events, 66 means Codex produced no result, and 67 means Codex
reported a failed turn; `run.json` and `progress.log` hold the message in each
case. Retry at most once after diagnosing a transient failure.

Parallel independent tasks are fine: separate worktrees, separate artifact
directories.

After the worker exits, inspect staged, unstaged, and untracked changes plus
`git diff "$START_TIP" HEAD`. A worker may have committed despite its prompt; an
empty working-tree diff is not sufficient evidence. Account for every path
against the initial state. Preserve unrelated work and resolve uncertain
ownership before staging, deleting, or ignoring files. Use `commit` within the
caller's authorization to capture only the verified task result.

If the task depends on uncommitted input, use the current checkout or transfer
only explicitly scoped input into isolation. Never copy unrelated user changes.

## Delivery and cleanup

The parent owns delivery within user authorization. Delegating implementation
does not authorize push, PR creation, or integration into another checkout. A
human reviews the work before it ships. Capture and verify the complete result
before integration or cleanup; retain branches backing open PRs.

For isolated results, read
[delivery and continuation](references/delivery-and-continuation.md) before
integration, cleanup, or a post-integration correction. It covers ancestry
checks, squash integration, separate-clone patches including new files, and safe
resets.

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

Resume the same worker for a focused correction. Read
[delivery and continuation](references/delivery-and-continuation.md) for session
commands and safe alignment after an earlier round was integrated. Preserve
uncaptured work; do not reset a worker to the pre-implementation destination.
Reassess repeated unsuccessful attempts rather than looping blindly.

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

## Scope Control

- If the task grows beyond the original scope, stop and recommend a split.
- If architectural issues appear, return them to the parent. Do not redesign the
  system independently.
- If requirements are missing, report the gap and recommended next step.
- If repeated failures happen, explain the blocker. Do not retry the same
  approach indefinitely.
- Preserve unrelated user changes.

## Reporting Back

After Codex finishes, the parent must inspect the result before presenting it.

Report:

- What Codex changed
- Files changed
- Verification run and result
- Any parent adjustments after review
- Assumptions, limitations, or follow-up work

If Codex was blocked, report why, what information is missing, and the next
recommended step.
