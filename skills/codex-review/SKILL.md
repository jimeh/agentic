---
name: codex-review
description: >-
  Run an independent Codex CLI review of code changes, commits, branches, or
  pull requests to improve confidence in correctness, security, regressions,
  and test coverage.
---

# Codex Review

Read and apply the `review-code` skill as the source of truth for the review
brief, inspection policy, finding acceptance, revision coverage, and reporting.
This skill owns only Codex-specific transport, process lifecycle, and session
continuation.

Start each initial review in a fresh Codex session. Fresh context does not
require a disposable session: preserve it when an orchestration workflow may
need the same reviewer for follow-up verification. Claude remains the
orchestrator and final judge.

Use this skill for broad or risky changes, user-requested Codex reviews,
reviewing Claude's own implementation, or getting a cheap second perspective on
a plan or diff.

Do not use it for small local reviews, formatting-only diffs, or to avoid
reading the code yourself. Fresh context provides context independence, not
cross-engine diversity. Do not infer implementation provenance or describe a
Codex review of known Codex-authored work as cross-engine. Honor explicit
reviewer selection and `dual-review` workflows. Treat Codex's report as
evidence, not authority.

Assume `codex` is installed and configured to use the desired GPT/Codex model
unless the environment proves otherwise.

## Workflow

1. Use `review-code` to pin the target and build the compact review brief.
2. Verify the current directory with `pwd`. Run Codex from the repo root or the
   intended worktree.
3. Create a temporary artifact directory.
4. Write a concise prompt carrying the brief and the `review-code` output
   requirements; do not assume the launched process can load this skill.
5. Run `codex-headless --review` in prompt form. Use a bare scope flag only for
   a lightweight review that does not claim `review-code` coverage (the two
   cannot be combined). Use a plain `codex-headless` run only when neither form
   can express the target.
6. Confirm the run succeeded, then read `result.md`.
7. Apply `review-code` to accept findings and report the result.

## Command Shapes

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-review.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
```

Apply `review-code` through the prompt form: write the brief and the reviewer
contract to `$PROMPT`, name the exact target inside it, and run:

```bash
codex-headless --artifact-dir "$ARTIFACT_DIR" --review < "$PROMPT"
```

Scope flags reject custom instructions, so a bare scope run gives Codex neither
the brief nor the output contract. Use one only for a lightweight second look
that is reported as such. Scope flags go after `--`, and the runner then reads
nothing from stdin:

```bash
# Staged, unstaged, and untracked changes.
codex-headless --artifact-dir "$ARTIFACT_DIR" --review -- --uncommitted

# Current branch against a base branch.
codex-headless --artifact-dir "$ARTIFACT_DIR" --review -- --base main

# A single commit.
codex-headless --artifact-dir "$ARTIFACT_DIR" --review -- --commit <sha>
```

If neither form can express the target, use a plain run; the sandbox is
read-only by default:

```bash
codex-headless --artifact-dir "$ARTIFACT_DIR" < "$PROMPT"
```

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Codex diagnostics to `stderr.log`, the review report
to `result.md`, and run state including the session ID to `run.json`. Read the
small files first; inspect the raw stream only when diagnosing transport or
model behavior. For a large target, run in the background and tail
`progress.log`.

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md`. Exit 65 means the stream
carried malformed events, 66 means Codex produced no result, and 67 means Codex
reported a failed turn; `run.json` and `progress.log` hold the message in each
case. Retry at most once after diagnosing a transient failure.

For a one-shot review, add `--ephemeral` before the `--` separator:

```bash
codex-headless --artifact-dir "$ARTIFACT_DIR" --ephemeral --review < "$PROMPT"
```

When follow-up verification is likely, keep the session persisted and resume it
with a fresh artifact directory and prompt file; the `jq -e` form fails instead
of yielding `null` when the field is missing:

```bash
SESSION_ID="$(jq -er '.sessionId | select(type == "string" and length > 0)' \
  "$ARTIFACT_DIR/run.json")"
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-review.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

codex-headless --artifact-dir "$NEXT_ARTIFACT_DIR" --resume "$SESSION_ID" \
  < "$NEXT_PROMPT"
```

Give the resumed reviewer revision boundaries and concise finding summaries,
then have it inspect the delta from the repository rather than pasting prior
reports or large diffs. Before resuming, confirm the intended prior and current
review targets remain available and match the requested review. Use a fresh
reviewer when they do not, continuation is unavailable, or the reviewed scope
materially broadens.

Do not retry automatically when Codex reports no issues. If the run fails,
report that and decide whether direct review is still useful.

Once the review lifecycle is complete, remove the artifact directories so
prompts and reports do not accumulate.

## Prompt and Report

Prompts apply only to the prompt form. Keep them short and express the
`review-code` brief, inspection priorities, execution policy, and required
output directly. Do not paste large diffs, logs, or project explanations that
Codex can inspect itself.

Treat Codex's report as candidate evidence. Apply `review-code` before relaying
findings. If the report omits an explicit validation and test-quality verdict,
request it from the same session when practical; otherwise mark the review
incomplete. Do not imply Codex ran checks unless its report demonstrates that it
did.

## Failure Handling

- If `codex` is unavailable, say so and review directly if practical.
- If the target cannot be expressed through `--review`, use a plain read-only
  run.
- If Codex times out, report the timeout. Do not loop blindly.
- If Codex gives vague findings, verify only the plausible ones and discard the
  rest.
- If Codex's report conflicts with the code, trust the code.
