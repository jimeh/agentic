---
name: codex-review
description: >-
  Ask Codex CLI / gpt-5.6-sol for an independent code review of uncommitted
  changes, a branch diff, a commit, a PR checkout, or a specific
  implementation. Use when a user, agent, skill, or orchestration workflow asks
  Claude to have Codex or gpt-5.6-sol review work, when model-routing calls for
  a Codex review perspective, or when Codex should audit a diff for bugs,
  regressions, missing tests, security issues, or requirement mismatches. Do
  not use for small reviews Claude can handle directly, for diffs Codex itself
  authored, or as a substitute for Claude reading and validating the code.
---

# Codex Review

Start each initial review in a fresh Codex session. Fresh context does not
require a disposable session: preserve it when an orchestration workflow may
need the same reviewer for follow-up verification. Claude remains the
orchestrator and final judge.

Use this skill for broad or risky changes, user-requested Codex reviews,
reviewing Claude's own implementation, or getting a cheap second perspective on
a plan or diff.

Do not use it for small local reviews, formatting-only diffs, or to avoid
reading the code yourself. Do not use it on diffs Codex itself authored:
same-model review is weak independence, so Claude reviews those directly. Treat
Codex's report as evidence, not authority.

Assume `codex` is installed and configured to use the desired GPT/Codex model
unless the environment proves otherwise.

## Workflow

1. Identify the review target: uncommitted changes, base branch, commit SHA, PR
   checkout, or specific files.
2. Verify the current directory with `pwd`. Run Codex from the repo root or the
   intended worktree.
3. Create a temporary artifact directory.
4. Gather only the context Codex needs: user request, target, base branch or
   commit, relevant requirements, and risky areas.
5. Write a concise prompt if custom instructions are needed.
6. Run `codex review` with a scope flag, or with a custom prompt when extra
   context matters (the two cannot be combined). Use `codex exec -s read-only`
   only when neither form can express the target.
7. Read the report.
8. Verify important claims against the code.
9. Return validated findings.

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
than pasting prior reports or large diffs. Use a fresh reviewer when
continuation is unavailable or the reviewed scope materially broadens.

Do not retry automatically when Codex reports no issues. If the run times out or
fails, report that and decide whether direct review is still useful.

Once the review lifecycle is complete, remove the artifact directory so prompts
and reports do not accumulate.

## Prompting Strategy

Prompts apply to the prompt form only; keep them short. Do not paste large
diffs, logs, or long project explanations unless Codex cannot inspect the target
itself.

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

Before relaying a Codex finding, inspect the cited code or diff enough to decide
whether the finding is real. Prefer a smaller number of verified findings over a
long list of unchecked suggestions.

In the user-facing response:

- Lead with confirmed issues, ordered by severity.
- Separate verified findings from unverified Codex suggestions.
- Explain the concrete failure mode, not just Codex's wording.
- If Codex found nothing, say that clearly and identify exactly what it
  reviewed.
- Do not imply Codex performed tests unless the report shows that it did.

Use this shape:

```md
Codex reviewed: <target>

Confirmed findings:
- <severity>: <file:line> <issue and failure mode>

Unverified Codex suggestions:
- <suggestion, if worth mentioning>

No substantive findings from Codex.
Residual risk: <untested area, if any>
```

Omit empty sections.

## Failure Handling

- If `codex` is unavailable, say so and review directly if practical.
- If Codex cannot express the target with `codex review`, use read-only exec.
- If Codex times out, report the timeout. Do not loop blindly.
- If Codex gives vague findings, verify only the plausible ones and discard the
  rest.
- If Codex's report conflicts with the code, trust the code.
