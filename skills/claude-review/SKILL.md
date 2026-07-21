---
name: claude-review
description: >-
  Ask Claude Code CLI for an independent code review of uncommitted changes, a
  branch diff, a commit, a PR checkout, or a specific implementation. Use when
  a user, agent, skill, or orchestration workflow asks a non-Claude agent to
  have Claude review work, when
  model-routing calls for a Claude review perspective, or when Claude should
  audit a diff for bugs, regressions, missing tests, security issues, or
  requirement mismatches. Do not use for small reviews the current agent can
  handle directly, for diffs Claude itself authored, or as a substitute for
  reading and validating the code yourself.
---

# Claude Review

Start each initial review in a fresh Claude Code session. Fresh context does not
require a disposable session: preserve it when an orchestration workflow may
need the same reviewer for follow-up verification. The orchestrating agent
remains the final judge.

Use this skill for broad or risky changes, user-requested Claude reviews,
reviewing another model's implementation, or getting a strong second perspective
on a plan or diff.

Do not use it for small local reviews, formatting-only diffs, or to avoid
reading the code yourself. Do not use it on diffs Claude itself authored:
same-model review is weak independence, so review those directly. Treat Claude's
report as evidence, not authority.

Assume `claude` is installed and authenticated unless the environment proves
otherwise.

## Workflow

1. Identify the review target: uncommitted changes, branch vs base branch,
   commit SHA, PR checkout, or specific files.
2. Verify the current directory with `pwd`. Run Claude from the repo root or the
   intended worktree.
3. Create a temporary artifact directory.
4. Gather only the context Claude needs: user request, target, base branch or
   commit, relevant requirements, and risky areas.
5. Write a concise review prompt that names the target.
6. Run headless `claude -p` in plan mode with safe mode so the session stays
   read-only and the target repo's customizations cannot execute.
7. Read the report.
8. Verify important claims against the code.
9. Return validated findings.

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

- For long reviews, run in the background and read `$REPORT` when the run exits.
  Do not kill quiet runs prematurely; long silences are normal.
- Parallel independent reviews are fine: separate prompt and report files.
- Resume the same reviewer for focused fix verification when possible. Give it
  revision boundaries and concise finding summaries, then have it inspect the
  delta from the repository rather than pasting prior reports or large diffs.
  Before resuming, confirm the intended prior and current review targets remain
  available and match the requested review. Use a fresh reviewer when they do
  not, continuation is unavailable, or the reviewed scope materially broadens.

Do not retry automatically when Claude reports no issues. A run that exits
nonzero or leaves an empty or missing report has failed — read the stderr log
and surface the failure; never treat it as a clean review. If the run times out
or fails, report that and decide whether direct review is still useful.

Once the review lifecycle is complete, remove the artifact directory
(`rm -rf "$ARTIFACT_DIR"`) so prompts and reports do not accumulate.

## Prompting Strategy

Keep prompts short. Do not paste large diffs, logs, or long project
explanations; Claude can inspect the target itself.

Start with this shape:

```text
Review this implementation.

Target: <uncommitted changes | branch vs base | commit | files>
Repository: <absolute repo path>
Context: <one or two task-specific sentences, only if needed>

Look for:
- correctness
- bugs
- edge cases
- maintainability
- unintended behavior

Produce a concise report. Findings first.

For each finding include:
- severity
- file and line reference
- concrete failure mode
- suggested fix direction

Do not edit files. If there are no substantive findings, say so.
```

Add only context that changes review quality: requirements, invariants, threat
model, expected behavior, or known risky files. Avoid long paragraphs.

## Reporting Strategy

Before relaying a Claude finding, inspect the cited code or diff enough to
decide whether the finding is real. Prefer a smaller number of verified findings
over a long list of unchecked suggestions.

In the user-facing response:

- Lead with confirmed issues, ordered by severity.
- Separate verified findings from unverified Claude suggestions.
- Explain the concrete failure mode, not just Claude's wording.
- If Claude found nothing, say that clearly and identify exactly what it
  reviewed.
- Do not imply Claude performed tests unless the report shows that it did.

Use this shape:

```md
Claude reviewed: <target>

Confirmed findings:
- <severity>: <file:line> <issue and failure mode>

Unverified Claude suggestions:
- <suggestion, if worth mentioning>

No substantive findings from Claude.
Residual risk: <untested area, if any>
```

Omit empty sections.

## Failure Handling

- If `claude` is unavailable, say so and review directly if practical.
- If Claude times out, report the timeout. Do not loop blindly.
- If Claude gives vague findings, verify only the plausible ones and discard the
  rest.
- If Claude's report conflicts with the code, trust the code.
