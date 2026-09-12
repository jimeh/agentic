---
name: claude-analysis
description: >-
  Delegate bounded read-only analysis to Claude CLI when a separate worker
  is selected. No edits, code review, or final judgment.
---

# Claude Analysis

Use Claude for bounded read-only analysis where a separate model context or its
long-running investigation ability helps. The parent remains responsible for
checking important claims and deciding what the evidence means.

This skill is for logs, documents, traces, datasets, generated output, and broad
multi-file searches. Use `claude-review` for code review and
`claude-implementation` for edits. Keep browser and GUI work in Codex.

The headless runner denies native worker tools and delegation skills. If the
parent explicitly requires nested workers, it must choose another supported
execution arrangement; do not attempt to bypass the runner restrictions.

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

## Workflow

1. Name the target and the specific question Claude should answer.
2. Verify the current directory with `pwd`.
3. Create a private temporary artifact directory and write the prompt there.
4. Run `claude-headless` in plan mode with user settings.
5. Confirm the run succeeded, read `result.md`, then spot-check consequential
   claims against the source.
6. Report the answer, evidence, uncertainty, and useful next step.

## Invocation

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-analysis.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
SESSION_ID="$(uuidgen)"

claude-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --model fable \
  --setting-sources user \
  --permission-mode plan \
  --session-id "$SESSION_ID" \
  < "$PROMPT"
```

Fable 5.1 at high effort is the default. Use `--model opus` when the user asks
for Opus; the runner pins Opus 5 at medium effort. Pass an explicit `--effort`
only when the user overrides the model-family default. Context size is Claude
CLI's decision.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Claude diagnostics to `stderr.log`, the terminal
answer to `result.md`, and run state to `run.json`. Read the small files first;
inspect the raw stream only when diagnosing transport or model behavior.

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md`. Exit 65 means the stream
carried malformed events, 66 means Claude produced no result, and 67 means
Claude reported an error result; `run.json` and `progress.log` hold the message
in each case. Retry at most once after diagnosing a transient failure.

For a focused follow-up, create a new artifact directory and prompt file and
pass `--resume "$SESSION_ID"` instead of `--session-id`, keeping the original
model and effort. Start fresh when the target or question materially changes.

```bash
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-analysis.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

claude-headless \
  --artifact-dir "$NEXT_ARTIFACT_DIR" \
  --setting-sources user \
  --permission-mode plan \
  --resume "$SESSION_ID" \
  < "$NEXT_PROMPT"
```

## Prompt contract

Give Claude the repository, target, question, evidence standard, and output
shape. Include these boundaries:

```text
This is read-only analysis delegated by the parent.
- Do not edit files or perform external mutations.
- Do not invoke delegation skills or launch native or CLI model workers.
- Prefer evidence with paths, lines, timestamps, or short excerpts.
- Say when evidence is missing or inconclusive.

Report:
- answer
- supporting evidence
- uncertainty or gaps
- suggested next step
```

Do not request `show-me-your-work` merely for liveness. The stream owns
operational progress. A read-only plan-mode run cannot reliably append a
decision trail.

## Lifecycle and failure handling

- Let a healthy process reach terminal exit. Quiet output and low CPU are not
  stall evidence.
- Do not impose a hard timeout unless the caller supplies one. Use a 60-minute
  checkpoint at minimum, and prefer 90 minutes for a large target.
- A failed run is one the status check above rejects. Inspect `run.json` and
  `stderr.log` before any retry.
- Remove the artifact directory after consuming it unless the user asked to
  inspect the files.
