---
name: claude-review
description: >-
  Execute a delegated review through Claude CLI. Use when explicitly
  requested or selected by the review workflow; review-code owns generic routing.
---

# Claude Review

Read and apply the `review-code` skill as the source of truth for the review
brief, inspection policy, finding acceptance, revision coverage, and reporting.
This skill owns Claude-specific transport, isolation, progress, process
lifecycle, and session continuation.

Start each initial review in a fresh Claude session. Preserve it when an owning
workflow may need focused follow-up verification. The orchestrating agent
remains the final judge.

Use this transport only when explicitly requested or selected by review-code.
The orchestrating agent owns final judgment. Fresh same-engine context provides
independence from the authoring conversation, not cross-engine diversity.

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

1. Use `review-code` to pin the target and build the compact review brief.
2. Verify the current directory with `pwd` and run from the intended checkout.
3. Create a private artifact directory and write the prompt.
4. Run `claude-headless` in plan mode with managed user skills available.
5. Confirm the run succeeded, read `result.md`, and apply `review-code` to every
   candidate finding.
6. Return accepted findings and the validation and test-quality verdict.

## Invocation

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-review.XXXXXX")"
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

Fable 5.1 at high effort is the default. Do not drop reviews to medium: in
side-by-side runs it lost the deepest finding each time. Use `--model opus` when
the user asks for Opus; the runner pins Opus 5 at medium effort. Explicit user
effort instructions win. Leave context size to Claude CLI.

`--setting-sources user` keeps managed skills such as `review-code` available
without loading project or local execution hooks. For a trusted checkout where
project guidance materially improves the review, use `user,project`. Do not load
`local` by default, and do not use `--safe-mode` or `--bare`.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, diagnostics to `stderr.log`, the terminal report to
`result.md`, and run state to `run.json`. Read the raw stream only when
diagnosing transport, model routing, or a failed result extraction.

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md`. Exit 65 means the stream
carried malformed events, 66 means Claude produced no result, and 67 means
Claude reported an error result; `run.json` and `progress.log` hold the message
in each case. Retry at most once after diagnosing a transient failure.

## Prompt contract

Keep the prompt short. Include the `review-code` brief, target, requirements,
inspection priorities, execution policy, and output shape. Add these boundaries:

```text
This review was delegated by the parent.
- Stay read-only.
- Do not invoke delegation skills or launch native or CLI model workers.
- Inspect the target from the repository rather than relying on pasted diffs.
- Report only findings supported by concrete code evidence.
- Include a separate validation and test-quality verdict.
```

Treat Claude's report as candidate evidence. Verify plausible findings against
the code and discard unsupported ones. Do not imply Claude ran checks unless the
report demonstrates it.

## Continuation

For each continuation, create a new artifact directory and prompt file and
resume the initial session:

```bash
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-review.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

claude-headless \
  --artifact-dir "$NEXT_ARTIFACT_DIR" \
  --setting-sources user \
  --permission-mode plan \
  --resume "$SESSION_ID" \
  < "$NEXT_PROMPT"
```

The block above relies on the runner default model; add `--model` and `--effort`
only to repeat what the initial run used when it overrode that default. Give the
reviewer revision boundaries and concise finding summaries, then have it inspect
the delta itself. Start fresh if the scope materially broadens or the old target
is unavailable.

## Lifecycle and failure handling

- Start one initial process and let it run to terminal exit. Quiet output, an
  incomplete report, and low CPU are normal while it works.
- Do not impose a hard timeout unless the caller supplies one. Use a 60-minute
  checkpoint at minimum and prefer 90 minutes for a large change. A checkpoint
  is for inspecting liveness and errors, not killing a healthy process.
- Terminate only for user cancellation, an explicit deadline, or concrete
  failure or wedge evidence. Resume an interrupted persisted session when
  practical instead of starting over.
- A failed review is one the status check above rejects. Inspect `run.json` and
  `stderr.log` before any retry.
- Do not retry merely because Claude reports no findings.
- Remove artifacts after the owning workflow consumes them unless the user asked
  to inspect them.

Do not use `show-me-your-work` as review liveness. Stream events own progress,
and plan mode cannot reliably append a decision trail.
