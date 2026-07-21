---
name: ship-feature-pr
description: >-
  Orchestrate a feature end to end into a reviewed pull request: gather the
  feature and base branch, reuse an existing plan or create one, implement,
  commit and push, open a draft PR, run one Codex and one Claude reviewer in
  parallel, reconcile their findings, wait for CI, and mark the PR ready. Use
  when the user asks to ship a feature as a PR, run the feature PR pipeline,
  take a change end to end into a pull request, or orchestrate
  plan-implement-review for a PR. Do not use for tiny single edits, commit-only
  or PR-only requests, or review-only requests; dedicated skills cover those.
---

# Ship Feature PR

Take a feature from request to reviewed, ready pull request. The orchestrator
owns judgement, state safety, integration, review reconciliation, and delivery.
Delegate implementation and independent review where those perspectives add
value.

Invoking this skill authorizes the branch, worktree, commit, push, and pull
request mutations needed by the workflow. It does not authorize merging,
deploying, or releasing.

## Core Contracts

### Delivery checkout ownership

Treat the checkout active when the skill is invoked as the **delivery
checkout**. Use it to integrate the finished implementation, create and hold the
feature branch, commit, push, and create the pull request. It remains the final
local home of the branch.

Being detached, linked, or outside the root worktree is not by itself a reason
to relocate delivery. Use another orchestrator checkout only when a concrete Git
or environment constraint makes the delivery checkout unsafe. Treat that
checkout as temporary and retain it until handback succeeds or the user accepts
another final destination.

### Engine routing

Use native subagent or task tooling for same-engine planning, implementation,
and review. Use a dedicated cross-engine skill or CLI for work that requires the
other engine. For example, a Codex orchestrator uses a native Codex reviewer and
the Claude review channel; a Claude orchestrator does the reverse.

Do not invoke the orchestrator's own CLI merely for isolation or model pinning
when native tooling is available. A same-engine CLI is a fallback only when
native tooling is unavailable or lacks a required capability.

### Context continuity

Use fresh agents for independent initial perspectives. Reuse the implementer for
focused corrections and reuse the original reviewers for fix verification when
their sessions can continue. Fresh reviewers are fallbacks for unavailable or
invalid continuations, or for changes that materially broaden the reviewed
scope.

## Workflow

### 1. Intake

Before changing local state, record enough of the delivery checkout to restore
and verify it later:

- invocation path, repository root, branch or detached state, and current head;
- whether it is the root or a linked worktree and the current worktree mapping;
- staged, unstaged, and untracked user changes, including their content where
  needed to prove preservation.

Do not stash, discard, stage, or otherwise normalize pre-existing work merely to
start the workflow.

Establish the requested change and target base branch. Use the remote default
branch when the user did not specify one, and state the assumption. Find the
latest applicable plan in the conversation or referenced documents and decide
whether it is settled, provisional, stale, or incomplete. A plan the user has
already approved, including a completed planning discussion followed by this
skill invocation, is settled and needs no second approval.

Verify repository access, the remote base, and both required review channels
before mutation. Select the native same-engine channel when possible and its
allowed fallback otherwise. Missing native tooling alone is not a blocker;
missing both same-engine options or the foreign reviewer is.

### 2. Plan

Reuse a settled plan when it still matches the request. Resolve small,
code-grounded gaps directly. Replan only when the existing approach is
materially stale or incomplete.

When no applicable plan exists, use a fresh native planning agent for a
non-trivial feature and plan directly for an obvious small change. Ask the user
to settle unresolved product or scope choices. Unless the user already granted
autonomy, obtain approval for a provisional plan before implementation.

Freeze the result into a concise implementation spec covering the objective,
constraints, expected file scope, success criteria, testing, risks, and
non-goals. Identify scope early enough to compare it with the captured dirty
state before moving branches or integrating work.

### 3. Prepare the Delivery Branch

Prefer keeping all orchestration in the delivery checkout. Reuse a relevant
feature branch, or create one there from the current remote base. A detached
checkout at the intended base is a valid place to create the branch.

Preserve non-overlapping user changes in place. Ask only when existing changes
overlap the implementation scope or branch movement would put them at risk. Do
not silently absorb user work into the feature.

If a separate orchestrator checkout is genuinely necessary, record its path and
reason. Never remove it while it is the only safe local home of the feature
branch.

### 4. Implement and Integrate

For non-trivial work, delegate to one fresh native implementer in an isolated
worktree or branch. When delegating, keep that agent away from the delivery
checkout. Direct implementation there is acceptable when the change is small
enough that delegation would add more cost than perspective; disclose that in
the final report.

Give the implementer the frozen spec and relevant verification expectations.
When it finishes:

1. Review the complete result as a contributor diff.
2. Run appropriate project checks yourself.
3. Send focused corrections back through the same implementer session. Take over
   after repeated unsuccessful correction attempts.
4. Integrate the complete result, including new files, into the feature branch
   in the delivery checkout.

Preserve the intake baseline throughout integration. Limit staging to approved
feature paths and retain temporary implementation work until final delivery is
verified.

### 5. Commit, Push, and Open the Draft PR

Use the `commit-push-pr` skill for commit conventions, push behavior, template
detection, and PR copy, but create the pull request as a draft.

Commit only the approved feature scope. When unrelated changes are already
staged, use a scoped commit approach that excludes them while leaving their
index state and content exactly as found. Verify that property before and after
every feature commit, including fix commits, and verify that new feature files
were included.

Push and create the pull request from the delivery checkout. The PR remains a
draft until review, CI, and local delivery all pass.

### 6. Run the Initial Dual Review

Run two fresh reviewers in parallel against the pushed feature state:

- one through the orchestrator's native same-engine channel;
- one through the dedicated foreign-engine review channel.

Give both reviewers the repository, target base and feature state, and a
condensed implementation spec. Ask them to inspect the repository themselves for
requirement mismatches, correctness problems, edge cases, weak tests, security
issues, and unintended behavior. Keep prompts compact; do not paste large diffs,
logs, reports, or path lists into them.

Keep each review read-only and retain any session handle that allows later
continuation. Accept a result only after the review completed successfully and
clearly identifies the pushed revision it covered. Ensure retries cannot be
mistaken for or consume output from an earlier attempt.

Both engine perspectives are required for the ready gate. If a channel remains
unavailable after a bounded retry, continue with the evidence available but
leave the PR draft and report the coverage gap.

### 7. Reconcile, Fix, and Re-review

Treat reviewer findings as evidence, not authority. Verify each one against the
code, weigh the reviewer independent of the implementer most heavily, and record
concise reasons for dismissals.

Fix confirmed findings through the same implementer session when practical, then
run checks, commit only the fix scope, and push from the delivery checkout.

Resume the original reviewer sessions for focused fix verification when
possible. Give each reviewer the last revision it accepted, the new verified
remote tip, and concise summaries of the relevant findings. Ensure both
revisions are available in the review checkout and have the reviewer inspect
only the intervening changes and affected paths from the repository. Do not
paste generated diffs, long path lists, or prior reports into the prompt.

Require each continued review to complete successfully and identify the new tip
it covered. If continuation is unavailable or invalid, use a fresh reviewer
through the same engine channel. If the fixes materially expand the
implementation beyond the original findings, use fresh reviewers for both
channels and review the expanded scope.

Limit the loop to two fix rounds. Surface anything still open rather than
continuing indefinitely.

### 8. Deliver

Wait for required CI checks on the final pushed state. Route actionable CI
failures through the same bounded fix and review loop. Do not mark the PR ready
before local delivery is complete.

Before cleanup, verify in the delivery checkout that:

- the expected feature branch is attached there;
- its head matches the pushed remote branch and tracks the expected upstream;
- all pre-existing staged, unstaged, and untracked changes remain intact;
- the worktree mapping contains no unintended branch attachment.

Only then remove workflow-created worktrees and verify the mapping again. If
handback is blocked, retain the checkout holding the feature branch, keep the PR
draft, and report its path and the blocker. Use another final local destination
only with explicit user acceptance.

Mark the PR ready only when both reviewer channels cover the final state,
required CI is green, handback is verified, and temporary checkout cleanup is
safe.

Report the PR URL and base, what shipped, review decisions, checks and CI,
delivery-checkout path, final branch and revision, upstream state, preserved
pre-existing changes, and any retained checkout or residual risk.
