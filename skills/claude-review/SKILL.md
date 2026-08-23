---
name: claude-review
description: >-
  Run an independent Claude Code CLI review of code changes, commits, branches,
  or pull requests to improve confidence in correctness, security, regressions,
  and test coverage.
---

# Claude Review

Read and apply the `review-code` skill as the source of truth for the review
brief, inspection policy, finding acceptance, revision coverage, and reporting.
This skill owns Claude-specific transport, isolation, progress, process
lifecycle, and session continuation.

Start each initial review in a fresh Claude session. Preserve it when an owning
workflow may need focused follow-up verification. The orchestrating agent
remains the final judge.

Use this skill for broad or risky changes, user-requested Claude reviews,
reviewing another model's implementation, or a strong second perspective. Do not
use it for small local reviews, formatting-only diffs, or to avoid reading the
code yourself. Fresh context gives context independence, not automatic
cross-engine diversity.

## Workflow

1. Use `review-code` to pin the target and build the compact review brief.
2. Verify the current directory with `pwd` and run from the intended checkout.
3. Create a private artifact directory and write the prompt.
4. Run `claude-headless` in plan mode with managed user skills available.
5. Read `result.md` and apply `review-code` to every candidate finding.
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

Fable 5 at high effort is the default. Use `--model opus` when the user asks for
Opus; the runner pins Opus 5 at medium effort. Explicit effort instructions win.
Leave context size to Claude CLI.

`--setting-sources user` keeps managed skills such as `review-code` available
without loading project or local execution hooks. For a trusted checkout where
project guidance materially improves the review, use `user,project`. Do not load
`local` by default, and do not use `--safe-mode` or `--bare`.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, diagnostics to `stderr.log`, the terminal report to
`result.md`, and run state to `run.json`. Read the raw stream only when
diagnosing transport, model routing, or a failed result extraction.

## Prompt contract

Keep the prompt short. Include the `review-code` brief, target, requirements,
inspection priorities, execution policy, and output shape. Add these boundaries:

```text
This review was delegated by Codex.
- Stay read-only.
- Do not invoke codex-* skills or the Codex CLI.
- Inspect the target from the repository rather than relying on pasted diffs.
- Report only findings supported by concrete code evidence.
- Include a separate validation and test-quality verdict.
```

Treat Claude's report as candidate evidence. Verify plausible findings against
the code and discard unsupported ones. Do not imply Claude ran checks unless the
report demonstrates it.

## Continuation

For each continuation, create a new artifact directory and resume the initial
session:

```bash
claude-headless \
  --artifact-dir "$NEXT_ARTIFACT_DIR" \
  --model fable \
  --setting-sources user \
  --permission-mode plan \
  --resume "$SESSION_ID" \
  < "$NEXT_PROMPT"
```

Preserve the original model and effort unless the user overrides them. Give the
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
- A nonzero exit, malformed stream, or empty result is a failed review. Inspect
  `run.json` and `stderr.log`. Retry at most once after diagnosing a transient
  cause.
- Do not retry merely because Claude reports no findings.
- Remove artifacts after the owning workflow consumes them unless the user asked
  to inspect them.

Do not use `show-me-your-work` as review liveness. Stream events own progress,
and plan mode cannot reliably append a decision trail.
