---
name: dual-review
description: >-
  Run independent Codex and Claude reviews of the same code change and reconcile
  their findings against the evidence. Use for dual-review requests and the
  review phase of ship-feature-pr.
---

# Dual Review

Read and apply the `review-code` skill as the shared standard for target
pinning, the review brief, inspection, finding acceptance, revision coverage,
and reporting. This skill owns only reviewer independence, lifecycle
coordination, and synthesis.

Remain read-only under that skill's authorization boundary. When the user also
authorizes fixes or pull-request stewardship, complete and reconcile this review
before handing confirmed findings to the owning workflow.

## Run Independent Reviewers

Use `review-code` to pin one exact target and build one compact brief. Give that
same brief and review contract to both reviewers.

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

Start one initial attempt per reviewer and let each provider-specific skill own
its process lifetime. A coordination deadline is a status and escalation
checkpoint, not permission to interrupt a healthy reviewer, shorten its provider
guidance, or restart it because the other reviewer or CI finished. Keep
resumable sessions when follow-up is expected, otherwise clean up one-shot
artifacts. Check liveness before retrying, retry only a diagnosed terminal or
transient failure, and do not loop blindly.

## Reconcile the Reports

Accept a report only when it completed successfully and identifies the intended
revision. Return useful partial evidence, but mark the dual review incomplete if
either channel failed, was empty, or covered an ambiguous or stale revision.

Wait for both initial reports before acting on either. Treat reports as
evidence, not votes. Apply `review-code` finding acceptance to each candidate.
Agreement increases confidence but is not proof, and one well-supported finding
remains actionable. Deduplicate shared root causes, resolve disagreements from
the evidence, and explain dismissals.

Apply the `review-code` currentness check after reconciliation. For a pull
request, read back both live base and head; if either moved, report the captured
review as stale.

## Continue When Requested

When a caller supplies both prior reviewer sessions, findings, and prior and new
immutable base-head pairs, apply the `review-code` continuation criteria to both
reviewers. Resume only when both sessions qualify and remain available.

Use fresh reviewers when continuation is unavailable, revision identity is
uncertain, incremental coverage is ambiguous, or scope materially broadened. The
caller decides when both perspectives need renewed review; this skill executes
and reconciles that review.

## Report

Use the `review-code` reporting contract, adding separate reviewer and
validation/test verdicts for each channel, meaningful disagreements or
dismissals, and any session handles needed by a caller. Never describe
one-channel, partial, or stale coverage as a completed current dual review.
