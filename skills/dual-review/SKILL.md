---
name: dual-review
description: >-
  Run independent Codex and Claude reviews and reconcile their findings. Use
  when the user asks for a dual review, a Codex-and-Claude review, or the review
  phase of ship-feature-pr.
---

# Dual Review

Own review orchestration and synthesis, not the reviewed change. Remain
read-only: do not edit files, commit, push, post feedback, or mutate the pull
request. Temporary artifacts, safe ref fetches, and isolated review checkouts
are acceptable, but leave the caller's checkout and local work unchanged.

When the user also authorizes fixes or PR stewardship, complete this review and
hand its results to that workflow rather than absorbing its responsibilities.

## Pin the Target and Brief

Resolve the repository, applicable instructions, review scope, requirements, and
exact base and head revisions. For a pull request, also capture its URL, state,
changed files, and available check evidence. Review immutable revisions, not a
moving branch name.

Snapshot local staged, unstaged, and untracked work. Avoid switching the
caller's checkout; fetch safely or use a temporary checkout when needed.

Give both reviewers the same compact brief:

- repository, base, head, and scope;
- the user request and available specification, issue, or PR description;
- material invariants, risks, and non-goals; and
- existing validation evidence with its revision and environment limits.

State assumptions when requirements are incomplete. Do not derive a broader
contract from the implementation alone.

## Run Independent Reviewers

Preflight both channels, then start exactly one fresh Codex reviewer and one
fresh Claude reviewer concurrently when practical. Use a fresh native reviewer
for the orchestrator's engine and the corresponding `claude-review` or
`codex-review` skill for the other. Use the same-engine CLI only when native
tooling is unavailable.

Do not count the orchestrator as a reviewer. Give native reviewers the least
inherited context available, do not expose either initial report to the other
reviewer, and do not seed them with existing review conclusions unless the user
asked to verify those conclusions.

Run both channels regardless of known or unknown implementation provenance. Do
not infer authorship, weight findings by engine, or substitute two sessions from
one engine. Reliable provenance may describe an independence limitation, but it
does not decide whether a finding is correct.

Ask both reviewers to inspect requirements, correctness, edge cases, security,
unintended behavior, and validation proportionality. Require findings with
severity, location, concrete failure mode, and fix direction; the exact
revisions reviewed; an explicit no-findings verdict when appropriate; and a
separate validation and test-quality verdict.

Use an inspection-first execution policy. Do not repeat broad checks already
covered by valid evidence; allow focused reproducers only for concrete suspected
defects. Start one initial attempt per reviewer and let each provider-specific
skill own its process lifetime. A coordination deadline is a status and
escalation checkpoint, not permission to interrupt a healthy reviewer, shorten
its provider guidance, or restart it because the other reviewer or CI finished.
Keep resumable sessions when follow-up is expected, otherwise clean up one-shot
artifacts. Check liveness before retrying, retry only a diagnosed terminal or
transient failure, and do not loop blindly.

## Reconcile the Reports

Accept a report only when it completed successfully and identifies the intended
revision. Return useful partial evidence, but mark the dual review incomplete if
either channel failed, was empty, or covered an ambiguous or stale revision.

Wait for both initial reports before acting on either. Treat reports as
evidence, not votes: verify findings against the requirements, code, and
observable behavior. Agreement increases confidence but is not proof, and one
well-supported finding remains actionable. Deduplicate shared root causes,
resolve disagreements from the evidence, explain dismissals, and treat material
validation gaps as findings.

Read back a pull request's live base and head after reconciliation. If either
moved, report the captured review as stale rather than silently chasing the new
revision.

## Continue When Requested

When a caller supplies both prior reviewer sessions, findings, and prior and new
immutable base-head pairs, resume both reviewers only when the sessions and
revisions remain available, each prior revision is an ancestor of its new
counterpart, and the scope is a genuine continuation. Have them inspect the
effects of both base and head deltas and identify the new pair they covered.

Use fresh reviewers when continuation is unavailable, revision identity is
uncertain, incremental coverage is ambiguous, or scope materially broadened. The
caller decides when both perspectives need renewed review; this skill executes
and reconciles that review.

## Report

Lead with confirmed findings ordered by severity, then report exact revision
coverage, whether it matches the live target, separate reviewer and validation
verdicts, meaningful disagreements or dismissals, residual risk, and any session
handles needed by a caller. Say directly when there are no confirmed findings;
never describe partial or stale coverage as a completed current dual review.
