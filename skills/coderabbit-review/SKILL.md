---
name: coderabbit-review
description: >-
  Intentionally trigger, inspect, reconcile, and close CodeRabbit reviews on
  GitHub pull requests. Use when a user or workflow selects CodeRabbit as an
  external reviewer, asks for an `@coderabbitai review`, wants CodeRabbit
  findings addressed, or needs unresolved CodeRabbit threads, approval, or a
  `CHANGES_REQUESTED` state verified. Do not use merely because a PR exists.
---

# CodeRabbit Review

Use CodeRabbit as an intentionally selected external reviewer. Keep automatic
review churn out of active development, bind every accepted result to a commit,
and inspect the thread graph rather than trusting a flat check or summary.

## Core Contracts

- Do not apply or rely on a `coderabbit:review` label. A positive opt-in label
  can make later pushes eligible for automatic incremental reviews while it
  remains present.
- Do not enable or resume automatic reviews unless the user explicitly asks.
- Use a top-level `@coderabbitai review` PR comment for an incremental review.
  Use `@coderabbitai full review` only when the user requests a from-scratch
  pass or prior review context is unusable.
- Treat one explicit invocation as the default budget. A push does not itself
  authorize another external review.
- Treat CodeRabbit findings as evidence, not authority. Verify each finding
  against the current code before changing or resolving anything.
- Keep technical confidence separate from GitHub review-state closure. A small
  fix may need only orchestrator verification even when CodeRabbit must still
  clear a blocking review decision.

## 1. Resolve the Review Target

Resolve the repository, PR, base, current remote head, draft state,
`reviewDecision`, checks, and existing CodeRabbit reviews. Read the repository's
`.coderabbit.yaml` when present, especially:

- `reviews.auto_review.enabled`
- `reviews.auto_review.auto_incremental_review`
- `reviews.request_changes_workflow`

Do not edit CodeRabbit configuration unless the user asked for configuration
work. If automatic review is already enabled, report that manual triggering
alone cannot prevent service-side automatic reviews.

Record the candidate SHA before requesting review. Provider status or comments
that cover another SHA are stale evidence.

## 2. Trigger Once and Wait

Post the selected command as a new top-level PR comment. Do not put it in an
inline thread or reuse a label as the trigger.

Wait for a review or explicit terminal outcome covering the recorded SHA. Use a
bounded deadline, check liveness before retrying, and never retrigger while a
review remains active. A green check without a current review record is not by
itself review completion.

## 3. Inspect Thread-Aware Feedback

Use GitHub's thread-aware GraphQL data whenever resolution state matters. Flat
review and comment endpoints do not establish whether inline threads remain
open.

For each CodeRabbit thread, capture:

- thread id, resolution and outdated state;
- latest comment id, body, URL, file, and line;
- review id, state, and reviewed commit;
- whether the concern still matches the current diff.

Reconcile summary findings, inline threads, and nitpicks into one deduplicated
list before fixes begin. Classify each concern as valid, needs a decision,
already fixed, invalid, or optional. Explain dismissals briefly.

## 4. Address Findings Through the Caller Workflow

Batch confirmed findings into one correction list and one normal correction
push. Feed the correction through the caller's normal risk-based re-review
policy:

- **Orchestrator verification** for documentation, hygiene, test-only cleanup,
  or an obvious local fix whose focused evidence closes the risk.
- **Focused reviewer verification** for a localized production fix, a subtle
  finding, or a delta that invalidates one reviewer's reasoning. CodeRabbit may
  be this reviewer when its context is the relevant independent perspective.
- **Dual reviewer verification** for architecture, public contracts, security,
  authentication, data or persistence, concurrency or lifecycle behavior,
  multi-platform behavior, material scope expansion, or a correction that
  invalidates both prior reviews. Include CodeRabbit too only when it was
  selected or required and the external perspective is materially invalidated.

Use risk and invalidated assumptions, not raw line count. Preserve review and
test evidence for unchanged code when the reviewed SHA is an ancestor of the new
head and the intervening delta cannot affect it.

After the correction push, request another incremental CodeRabbit review only
when one of these applies:

- the focused tier selected CodeRabbit to verify its own technical finding;
- the dual tier materially invalidated the selected external perspective; or
- CodeRabbit still owns a `CHANGES_REQUESTED` decision that must be cleared.

The last case is review-state closure, not a reason to escalate a small fix to
dual technical review. When none applies, orchestrator verification can close a
small non-blocking correction without spending another external review.

## 5. Close Threads and Review State

When CodeRabbit re-reviews a correction, inspect its unresolved threads again.
For every thread it leaves open, verify the current head yourself:

- If the issue is clearly fixed, reply with concise evidence when useful and
  resolve the thread.
- If the issue is clearly invalid or already satisfied, explain why and resolve
  the thread.
- If the issue remains valid or confidence is insufficient, leave it open and
  return it for correction.

Never resolve a valid unaddressed concern merely to clear review state. Resolve
threads only when the caller already authorized review-state closure; otherwise
ask once before the first GitHub state mutation.

When `reviews.request_changes_workflow` is enabled, CodeRabbit can automatically
approve after all of its comments are resolved and pre-merge checks are green.
Wait for and verify the actual approval; thread resolution alone is not proof
that GitHub's `CHANGES_REQUESTED` decision cleared.

Do not use `@coderabbitai approve` as the normal closure path. If automatic
approval does not arrive after a bounded wait, first verify configuration,
unresolved threads, pre-merge checks, the reviewed SHA, and other reviewers'
decisions. Report the remaining blocker. Dismiss a stale or invalid blocking
review only with authority to perform that GitHub state mutation and a recorded
reason.

## 6. Report Completion

Report:

- PR and reviewed SHA;
- command used and whether the review was incremental or full;
- findings accepted, fixed, dismissed, or deferred;
- correction verification tier and why it was sufficient;
- unresolved CodeRabbit thread count;
- latest CodeRabbit review state and GitHub `reviewDecision`;
- whether automatic approval occurred and which checks gate it;
- any automatic-review configuration that can still cause future push churn.
