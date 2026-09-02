---
name: claude-analysis
description: >-
  Hand large read-only evidence sets to the Claude Code CLI for analysis,
  extraction, comparison, or triage. No edits, code review, or final judgement.
---

# Claude Analysis

Use Claude for bounded read-only analysis where a separate model context or its
long-running investigation ability helps. Codex remains responsible for checking
important claims and deciding what the evidence means.

This skill is for logs, documents, traces, datasets, generated output, and broad
multi-file searches. Use `claude-review` for code review and
`claude-implementation` for edits. Keep browser and GUI work in Codex.

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
This is read-only analysis delegated by Codex.
- Do not edit files or perform external mutations.
- Do not invoke codex-* skills or the Codex CLI.
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
