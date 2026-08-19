---
name: codex-review
description: >-
  Run an independent Codex CLI review of code changes, commits, branches, or
  pull requests to improve confidence in correctness, security, regressions,
  and test coverage.
---

# Codex Review

Read and apply the `code-review` skill as the source of truth for the review
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

1. Use `code-review` to pin the target and build the compact review brief.
2. Verify the current directory with `pwd`. Run Codex from the repo root or the
   intended worktree.
3. Create a temporary artifact directory.
4. Write a concise prompt when custom instructions are needed. Give Codex the
   brief and `code-review` output requirements; do not assume the launched
   process can load this skill.
5. Run `codex review` with a scope flag, or with a custom prompt when extra
   context matters (the two cannot be combined). Use `codex exec -s read-only`
   only when neither form can express the target.
6. Read the report.
7. Apply `code-review` to accept findings and report the result.

## Command Shapes

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-review.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
REPORT="$ARTIFACT_DIR/report.md"
```

Use the narrowest scope flag available. Scope flags reject custom instructions;
run them bare:

```bash
# Staged, unstaged, and untracked changes.
codex review --uncommitted > "$REPORT"

# Current branch against a base branch.
codex review --base main > "$REPORT"

# A single commit.
codex review --commit <sha> > "$REPORT"
```

When the review needs custom instructions (requirements, invariants, risky
areas), use the prompt form instead and name the target inside the prompt:

```bash
codex review - < "$PROMPT" > "$REPORT"
```

If neither form can express the target, use read-only exec:

```bash
codex exec -s read-only -o "$REPORT" - < "$PROMPT"
```

For a one-shot review, no session handle needs to be retained. When follow-up
verification is likely, use a persisted `codex exec review --json` session,
retain its explicit session ID, and resume it with `codex exec resume`; do not
use `--ephemeral`. Give the resumed reviewer revision boundaries and concise
finding summaries, then have it inspect the delta from the repository rather
than pasting prior reports or large diffs. Before resuming, confirm the intended
prior and current review targets remain available and match the requested
review. Use a fresh reviewer when they do not, continuation is unavailable, or
the reviewed scope materially broadens.

Do not retry automatically when Codex reports no issues. If the run times out or
fails, report that and decide whether direct review is still useful.

Once the review lifecycle is complete, remove the artifact directory so prompts
and reports do not accumulate.

## Prompt and Report

Prompts apply only to the prompt form. Keep them short and express the
`code-review` brief, inspection priorities, execution policy, and required
output directly. Do not paste large diffs, logs, or project explanations that
Codex can inspect itself.

Treat Codex's report as candidate evidence. Apply `code-review` before relaying
findings. If the report omits an explicit validation and test-quality verdict,
request it from the same session when practical; otherwise mark the review
incomplete. Do not imply Codex ran checks unless its report demonstrates that it
did.

## Failure Handling

- If `codex` is unavailable, say so and review directly if practical.
- If Codex cannot express the target with `codex review`, use read-only exec.
- If Codex times out, report the timeout. Do not loop blindly.
- If Codex gives vague findings, verify only the plausible ones and discard the
  rest.
- If Codex's report conflicts with the code, trust the code.
