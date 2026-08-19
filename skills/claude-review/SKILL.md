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
This skill owns only Claude-specific transport, isolation, process lifecycle,
and session continuation.

Start each initial review in a fresh Claude Code session. Fresh context does not
require a disposable session: preserve it when an orchestration workflow may
need the same reviewer for follow-up verification. The orchestrating agent
remains the final judge.

Use this skill for broad or risky changes, user-requested Claude reviews,
reviewing another model's implementation, or getting a strong second perspective
on a plan or diff.

Do not use it for small local reviews, formatting-only diffs, or to avoid
reading the code yourself. Fresh context provides context independence, not
cross-engine diversity. Do not infer implementation provenance or describe a
Claude review of known Claude-authored work as cross-engine. Honor explicit
reviewer selection and `dual-review` workflows. Treat Claude's report as
evidence, not authority.

Assume `claude` is installed and authenticated unless the environment proves
otherwise.

## Workflow

1. Use `review-code` to pin the target and build the compact review brief.
2. Verify the current directory with `pwd`. Run Claude from the repo root or the
   intended worktree.
3. Create a temporary artifact directory.
4. Write a concise prompt that gives Claude the brief and `review-code` output
   requirements; do not assume the launched process can load this skill.
5. Run headless `claude -p` in plan mode with safe mode so the session stays
   read-only and the target repo's customizations cannot execute.
6. Read the report.
7. Apply `review-code` to accept findings and report the result.

## Command Shapes

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-review.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
REPORT="$ARTIFACT_DIR/report.md"
```

There is no scope-flag review subcommand; always name the target inside the
prompt. Plan mode blocks file edits while still allowing read-only inspection
commands. Safe mode keeps the target repo's hooks, plugins, and other
customizations from executing — headless runs skip the workspace trust prompt,
so a malicious checkout could otherwise run code as the user. For a one-shot
review, disable session persistence so it leaves no resumable state behind:

```bash
claude -p \
  --permission-mode plan \
  --safe-mode \
  --no-session-persistence \
  < "$PROMPT" > "$REPORT" 2> "$ARTIFACT_DIR/stderr.log"
```

Drop `--safe-mode` only for a fully trusted checkout where project context
(CLAUDE.md, project settings) would materially improve the review.

When follow-up verification is likely, omit `--no-session-persistence`, assign
and retain an explicit session ID with `--session-id`, and resume it with
`--resume`. Preserve plan and safe mode on every continuation.

Model selection: the default configured model is fine. Pass `--model opus` (or
another alias) only when the user or model-routing rules ask for a specific
review tier.

Run notes:

- Start one initial Claude process and let it run to terminal exit. Run long
  reviews in the background and read `$REPORT` only after the process exits.
- Quiet stdout and stderr, an empty report, and low CPU usage are normal while
  `claude -p` is inspecting or waiting on the model. None is evidence of a
  stall, and another reviewer or CI finishing first is not a reason to interrupt
  Claude.
- Do not impose a hard process timeout unless the caller supplies a real
  deadline. When an orchestration workflow needs a finite coordination
  checkpoint and the caller supplied none, allow at least 60 minutes for the
  initial review and prefer 90 minutes for a large repository or change set.
  Treat that checkpoint as a time to inspect liveness and errors, not as
  automatic authority to terminate a healthy process.
- Terminate only for user cancellation, an explicit hard deadline, or concrete
  failure or wedge evidence. If termination is necessary, preserve and resume
  the explicit session when possible. Do not replace a quiet or interrupted run
  with a fresh attempt merely to reset the clock.
- Parallel independent reviews are fine: separate prompt and report files.
- Resume the same reviewer for focused fix verification when possible. Give it
  revision boundaries and concise finding summaries, then have it inspect the
  delta from the repository rather than pasting prior reports or large diffs.
  Before resuming, confirm the intended prior and current review targets remain
  available and match the requested review. Use a fresh reviewer when they do
  not, continuation is unavailable, or the reviewed scope materially broadens.

Do not retry automatically when Claude reports no issues. A run that exits
nonzero or leaves an empty or missing report after exit has failed — read the
stderr log and surface the failure; never treat it as a clean review. Retry only
after diagnosing a terminal failure as transient, and make at most one retry
unless the caller directs otherwise. If the run fails or an explicit hard
deadline expires, report that and decide whether direct review is still useful.

Once the review lifecycle is complete, remove the artifact directory
(`rm -rf "$ARTIFACT_DIR"`) so prompts and reports do not accumulate.

## Prompt and Report

Keep the prompt short and express the `review-code` brief, inspection
priorities, execution policy, and required output directly. Do not paste large
diffs, logs, or project explanations that Claude can inspect itself.

Treat Claude's report as candidate evidence. Apply `review-code` before relaying
findings. If the report omits an explicit validation and test-quality verdict,
request it from the same session when practical; otherwise mark the review
incomplete. Do not imply Claude ran checks unless its report demonstrates that
it did.

## Failure Handling

- If `claude` is unavailable, say so and review directly if practical.
- If an explicit hard deadline expires, report it. Do not loop blindly or
  convert an orchestration checkpoint into a timeout.
- If Claude gives vague findings, verify only the plausible ones and discard the
  rest.
- If Claude's report conflicts with the code, trust the code.
