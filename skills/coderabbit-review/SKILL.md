---
name: coderabbit-review
description: >-
  Handle CodeRabbit review on a GitHub pull request. Use when the user or another
  workflow explicitly selects CodeRabbit, requests an `@coderabbitai review`,
  wants its findings addressed, or needs its threads, approval, or blocking
  review state closed. Do not use merely because a PR exists.
---

# CodeRabbit Review

Use CodeRabbit as an intentionally selected external reviewer. Bind its evidence
to an exact commit and inspect review threads rather than trusting a flat
status.

## Resolve the Review

Resolve the PR, current remote head, draft state, checks, review decision, and
existing CodeRabbit reviews. Read `.coderabbit.yaml` when present, especially
automatic and incremental review settings and the request-changes workflow.

Do not enable automatic review or apply a review-triggering label unless the
user explicitly asks. Existing automatic review configuration may still cause
review churn; report it rather than silently changing it.

## Trigger and Wait

Record the candidate SHA. Post `@coderabbitai review` as an exact top-level bot
command for an incremental review. Use `@coderabbitai full review` only when the
user requests a fresh pass or prior context is unusable. Bot commands are exempt
from the human-facing comment provenance rules owned by `babysit-pr`.

Treat one explicit invocation as the default budget. Wait for a review or
terminal outcome covering the candidate SHA. Check liveness before retrying and
never retrigger an active review. A green check without a current review record
does not establish completion.

## Reconcile Findings

Fetch thread-aware data, including thread and review ids, resolution and
outdated state, latest replies, locations, reviewed commit, and URLs.
Deduplicate summary findings, inline comments, and nitpicks. Verify each concern
against the current code and classify it as valid, needs a decision, already
fixed, invalid, or optional.

When called by `babysit-pr` or `ship-feature-pr`, return confirmed findings to
that workflow for batching, correction, validation, commit, and push. Preserve
valid evidence across ancestor revisions when the delta cannot invalidate it.
Request another CodeRabbit pass only when it must verify its own substantive
finding, its perspective was materially invalidated, or its blocking review
decision still needs closure.

## Close Review State

After corrections, inspect every remaining CodeRabbit thread against the current
head. Reply with concise evidence when useful and apply the comment provenance
rules from `babysit-pr` to human-facing replies. Resolve a thread only when its
concern is fixed, invalid, or already satisfied. Never resolve a valid
unaddressed concern merely to clear review state.

Thread resolution is not approval. When request-changes workflow is enabled,
wait for and verify the resulting review decision and the checks that gate it.
Do not use `@coderabbitai approve` as the normal closure path. Dismiss a review
only with explicit authority and a recorded reason.

Report the reviewed SHA, trigger used, accepted and dismissed findings,
unresolved thread count, latest CodeRabbit review, GitHub review decision, and
any configuration that can still cause automatic reviews.
