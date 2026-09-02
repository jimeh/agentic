---
name: claude-implementation
description: >-
  Delegate bounded implementation from settled requirements to the Claude Code
  CLI, then inspect, verify, and deliver the result as Codex. Not for planning,
  architecture, ambiguous requirements, or browser work.
---

# Claude Implementation

Use Claude as a bounded implementation agent. Codex owns scope, architecture,
validation, Git, integration, and user communication.

Delegate only when the objective and observable success criteria are settled.
Keep ambiguous failures, product decisions, architecture, API design, and GUI
work in Codex until they are resolved.

## Workflow

1. Inspect `git status --short` and record the starting tip.
2. Define the objective, constraints, success criteria, and focused checks.
3. Use an isolated worktree for non-trivial, risky, or concurrent work.
4. Create a private artifact directory and write a concise prompt.
5. Run `claude-headless` from the intended checkout with write-capable Claude
   permissions.
6. Confirm the run succeeded, then inspect status, the working-tree diff, and
   every commit since the recorded starting tip. Claude may have committed
   despite the prompt.
7. Run focused verification yourself and review the complete result.
8. Integrate or deliver only within the user's existing authorization.

Do not let two implementation agents mutate the same checkout.

## Isolated worktree

```bash
TASK_SLUG="<short-task-slug>"
WORKTREE_PARENT="$(mktemp -d "${TMPDIR:-/tmp}/claude-worktree.XXXXXX")"
WORKTREE_DIR="$WORKTREE_PARENT/worktree"
BRANCH="claude/$TASK_SLUG"
START_TIP="$(git rev-parse HEAD)"
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-implementation.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
SESSION_ID="$(uuidgen)"

git worktree add -b "$BRANCH" "$WORKTREE_DIR" HEAD

(cd "$WORKTREE_DIR" && claude-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --model fable \
  --setting-sources user,project \
  --permission-mode auto \
  --session-id "$SESSION_ID" \
  < "$PROMPT")
```

Use `user,project` only for a trusted checkout where project guidance helps. Use
`--setting-sources user` otherwise. Do not load `local` settings by default.
Never use `--safe-mode`, `--bare`, or bypass-permissions mode.

Fable 5.1 at high effort is the default. `--model opus` pins Opus 5 at medium
effort. Explicit user model or effort instructions win. Do not force a context
size.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Claude diagnostics to `stderr.log`, the final report
to `result.md`, and run state to `run.json`. For long tasks, run in the
background and tail `progress.log` for liveness.

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md`. Exit 65 means the stream
carried malformed events, 66 means Claude produced no result, and 67 means
Claude reported an error result; `run.json` and `progress.log` hold the message
in each case. Retry at most once after diagnosing a transient failure.

For a small low-risk edit, run the same command from the current checkout after
confirming that this will not overlap unrelated user changes.

## Prompt contract

```text
Implement this bounded task delegated by Codex.

Repository: <absolute checkout path>
Objective: <one sentence>

Constraints:
- <task-specific constraints and non-goals>
- Preserve unrelated changes.
- Do not commit, push, open a PR, deploy, or edit global configuration.
- Do not invoke codex-* skills or the Codex CLI.
- Stop and report if architecture, API, product, UX, or destructive decisions
  are required.

Success criteria:
- <observable behavior>

Verification:
- <focused command or evidence>

Report:
- summary and files changed
- material decisions and assumptions
- verification run and result
- limitations or blockers
```

Keep prompts operational. Let Claude inspect the repository instead of pasting
large diffs or duplicating project instructions.

## Decision trail

For long unattended work, consequential choices, or an explicit user request,
create a private trail path inside the artifact directory. Pass the artifact
directory through Claude's `--add-dir` option and tell Claude to use the
`show-me-your-work` skill for material decisions, pivots, risks, and blockers.

```bash
TRAIL="$(mktemp "$ARTIFACT_DIR/decision-trail.tsv.XXXXXX")"
chmod 0600 "$TRAIL"

(cd "$WORKTREE_DIR" && claude-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --model fable \
  --setting-sources user,project \
  --permission-mode auto \
  --session-id "$SESSION_ID" \
  -- --add-dir "$ARTIFACT_DIR" \
  < "$PROMPT")
```

Put the trail path in the prompt. The runner accepts `--add-dir` only after its
own options separator, while retaining control of model, effort, settings,
permissions, and session flags.

Do not use the trail as a heartbeat, command log, or test ledger. The runner's
stream owns progress. Audit and clean up the trail according to
`show-me-your-work` before handback.

## Inspection and iteration

After Claude exits:

```bash
cd "$WORKTREE_DIR"
git status --short
git diff
git diff "$START_TIP" HEAD
```

Account for every path and inspect both committed and uncommitted changes. Run
focused checks yourself. Do not send Claude-authored work back to
`claude-review`; Codex is the cross-engine reviewer here.

When correction is useful, write the follow-up prompt to a fresh file, start a
fresh artifact directory, and resume the recorded session ID:

```bash
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-implementation.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

(cd "$WORKTREE_DIR" && claude-headless \
  --artifact-dir "$NEXT_ARTIFACT_DIR" \
  --setting-sources user,project \
  --permission-mode auto \
  --resume "$SESSION_ID" \
  < "$NEXT_PROMPT")
```

The block above relies on the runner default model; add `--model` and `--effort`
only to repeat what the initial run used when it overrode that default. Give the
resumed session only the correction, revision boundary, and proof expected. If
two correction rounds fail, stop delegating.

## Lifecycle

- Let healthy runs reach terminal exit. Quiet output and low CPU are not stall
  evidence.
- Do not add a hard timeout unless the caller supplies one. Treat a 60-minute
  minimum checkpoint, preferably 90 minutes for large work, as inspection time
  rather than termination authority.
- Diagnose a terminal failure before one possible retry. Never loop blindly.
- Remove temporary artifacts and worktrees after integration or abandonment.
  Keep a branch while an authorized PR based on it remains open.
- Do not push, publish, or integrate into another checkout without the user's
  authorization.
