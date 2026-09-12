---
name: codex-analysis
description: >-
  Delegate bounded read-only analysis to Codex CLI when a separate worker is
  selected. No edits, code review, or final judgment.
---

# Codex Analysis

Use Codex for read-only work where throughput matters. The parent stays
responsible for deciding what the evidence means and what to do next.

This skill fills the gap between code review, implementation, and computer use:
it is for analysis and investigation, not patching or final judgement.

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

Use this for source-checkable extraction, comparison, and triage of large logs,
documents, datasets, or multi-file evidence. Keep architecture decisions,
implementation, code review, and GUI work in their owning workflows.

## Workflow

1. Identify the analysis target: files, logs, docs, PDFs, specs, commits,
   generated output, or search space.
2. Define the question Codex should answer.
3. Create a temporary artifact directory for the prompt and run artifacts.
4. Run `codex-headless` with the default read-only sandbox.
5. Read `result.md` and spot-check important claims against the source.
6. Return the useful evidence, confidence, and next recommended step.

## Command Shape

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-analysis.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
```

Run Codex read-only from the repository or target directory:

```bash
codex-headless --artifact-dir "$ARTIFACT_DIR" < "$PROMPT"
```

No extra access flags are needed: the read-only sandbox can read the whole disk,
and the runner writes the artifacts from outside the sandbox. (`--add-dir`
grants write access; it has no place in read-only analysis.)

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Codex diagnostics to `stderr.log`, the answer to
`result.md`, and run state to `run.json`. Read the small files first; inspect
the raw stream only when diagnosing transport or model behavior. For a long
target, run in the background and tail `progress.log`.

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md`. Exit 65 means the stream
carried malformed events, 66 means Codex produced no result, and 67 means Codex
reported a failed turn; `run.json` and `progress.log` hold the message in each
case. Retry at most once after diagnosing a transient failure.

For a focused follow-up, resume the session with a new artifact directory and
prompt file; the `jq -e` form fails instead of yielding `null` when the field is
missing. Start fresh when the target or question materially changes.

```bash
SESSION_ID="$(jq -er '.sessionId | select(type == "string" and length > 0)' \
  "$ARTIFACT_DIR/run.json")"
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-analysis.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

codex-headless --artifact-dir "$NEXT_ARTIFACT_DIR" --resume "$SESSION_ID" \
  < "$NEXT_PROMPT"
```

## Prompting Strategy

Prompts should be short and specific. Ask a question; do not ask Codex to
explore aimlessly.

Use this shape:

```text
Analyze this read-only target.

Repository: <absolute repo path>
Target: <files/logs/docs/specs/search space>
Question: <specific question to answer>

Constraints:
- Do not edit files.
- Prefer evidence with file paths, line numbers, timestamps, or excerpts.
- Say when evidence is missing or inconclusive.

Report:
- answer
- supporting evidence
- uncertainty or gaps
- suggested next step
```

## Reporting Back

Treat Codex output as gathered evidence. Verify important claims before using
them as conclusions.

Report:

- What Codex analyzed
- Answer or summary
- Key evidence
- Uncertainty or gaps
- Recommended next step

If Codex cannot access the target, report what was missing and whether the
parent can continue with available context.
