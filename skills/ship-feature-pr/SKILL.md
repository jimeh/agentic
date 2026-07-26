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

Explicit user instruction may override the implementer engine. When it does,
keep both review channels and weigh the reviewer independent of the implementer
most heavily, as in step 7.

### Test quality

Tests are the primary evidence that the feature is correct. Planner,
implementer, orchestrator, and both reviewers hold the same bar:

- New and changed behavior is covered on both its happy path and its failure
  paths — errors, boundaries, and the conditions the code explicitly handles —
  along with existing behavior the change could regress.
- Tests assert observable behavior rather than implementation shape, and fail
  for the reason they claim to test. Mocking external boundaries is fine where
  it is needed; mocking the behavior under test, or letting a test turn on
  timing, ordering, or the environment, produces a gap that reports itself as
  coverage.
- Coverage that would survive reverting or breaking the logic it covers is not
  coverage.
- A green suite shows nothing regressed. It is never by itself evidence that the
  new work is tested.

How thoroughly a path is tested scales with its risk; whether a failure path is
covered at all does not. Ground any case for lighter coverage in the specific
code — what it can do wrong and what would notice — and record that reasoning in
the spec where a reviewer can challenge it. Effort, schedule, and how confident
the implementer feels are not justifications.

Thin existing tests around the change raise the cost of meeting this bar; they
never lower it. Standing up the scaffolding a first real test needs is in scope
for the feature. Back-filling coverage for code the feature does not touch is
not.

Skip automated tests only when the change is genuinely untestable in this
project — documentation, prose, and similar artifacts with no applicable
harness. A testable project whose relevant area merely lacks tests does not
qualify: build the scaffolding, or ask the user how to proceed. When tests are
genuinely skipped, name the alternative evidence and the residual risk, keep the
PR draft, and obtain explicit user acceptance before marking it ready.

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
autonomy, obtain approval for a provisional plan before implementation. If the
user rejects a plan, revise and re-present it rather than implementing around
the feedback.

Sanity-check the plan against the actual code before freezing it.

Map the tests that already cover the areas the feature will touch: what exists,
whether it exercises failure paths, and whether it would catch a regression.
This informs the approach; it is not a mandate to repair what is there. Where
the baseline is thin or absent, decide what the feature's own tests need in
order to be real — fixtures, a harness, the first test file for a module — and
put that work in the plan, so its cost is visible and approvable rather than
discovered and skipped mid-implementation. Record test debt you deliberately
leave alone as a non-goal. Where automated tests genuinely do not apply, say why
in the spec and name the verification evidence standing in for them.

Freeze the result into a concise implementation spec covering the objective,
constraints, expected file scope, success criteria, the testing strategy with
the exact focused and broader verification commands that prove it, risks, and
non-goals. Identify scope early enough to compare it with the captured dirty
state before moving branches or integrating work.

### 3. Prepare the Delivery Branch

Prefer keeping all orchestration in the delivery checkout. Refresh and verify
the remote base before creating the delivery branch or moving the checkout onto
it. Reuse an existing feature branch only when its base and commits belong to
the requested work; otherwise create a clean branch there or ask if local state
makes that unsafe. A detached checkout at the intended base is a valid place to
create the branch.

Preserve non-overlapping user changes in place. Ask only when existing changes
overlap the implementation scope or branch movement would put them at risk. Do
not silently absorb user work into the feature.

If a separate orchestrator checkout is genuinely necessary, record its path and
reason. Never remove it while it is the only safe local home of the feature
branch.

### 4. Implement and Integrate

For non-trivial work, delegate to one fresh same-engine implementer in a
separate worktree or clone, preferring native tooling and using the allowed
same-engine CLI fallback only when necessary. Keep that agent away from the
delivery checkout. Direct implementation there is acceptable when the change is
small enough that delegation would add more cost than perspective; disclose that
in the final report.

Give the implementer the frozen spec, the testing strategy, and the exact
verification commands. Require it to use tests as its running check on
correctness while it works rather than a step at the end, and to treat the work
as unfinished until it has well-grounded confidence in the implementation —
which for anything non-trivial means tests it has watched fail for the right
reason and then pass.

When it finishes:

1. Review the complete result as a contributor diff, tests included. For each
   substantive behavior it adds, identify the test covering it and the failure
   path that test exercises. Judge what you find against the test quality
   contract; an unexplained gap is a correction, not a note.
2. Run the new and changed tests yourself first — a full-suite run can hide
   tests that never executed — then the broader project checks. Establish
   negative evidence for substantive behavior: run the new tests against the
   pre-change code, or against a temporary perturbation where that is not
   possible, and confirm they fail. A test that passes either way is not
   covering the path it claims. Always restore the implementation afterwards,
   confirm the diff matches what it was before the perturbation, and rerun the
   focused tests before moving on.
3. Send focused corrections back through the same implementer session. Take over
   after two unsuccessful correction rounds.
4. Integrate the complete result, including new files, into the feature branch
   in the delivery checkout.

Do not transfer isolated work through a tracked-file-only diff; it can omit new
files.

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

Before pushing, verify that the captured non-feature index and worktree state
remains unchanged; stop if it does not.

Push and create the pull request from the delivery checkout. The PR remains a
draft until review, CI, and local delivery all pass.

### 6. Run the Initial Dual Review

Run two fresh reviewers in parallel against the pushed feature state:

- one through the orchestrator's native same-engine channel;
- one through the dedicated foreign-engine review channel.

For CLI-backed foreign review, use `claude-review` or `codex-review` as
appropriate and follow its read-only safety guidance. Preserve a resumable
session when this workflow expects reviewer continuity.

Give both reviewers the repository, target base and feature state, and a
condensed implementation spec. Ask them to inspect the repository themselves for
requirement mismatches, correctness problems, edge cases, security issues, and
unintended behavior. Require each finding to state its severity, location,
concrete failure mode, and suggested direction, and require reviewers to say
explicitly when they find no substantive issues. Keep prompts compact; do not
paste large diffs, logs, reports, or path lists into them.

Require a separate, explicit verdict on tests from both reviewers, returned even
when they have nothing else to report: which new behaviors and affected existing
paths lack coverage across happy, failure, boundary, and regression cases,
whether the tests assert observable behavior or merely restate the
implementation, whether mocking or nondeterminism lets a test pass over a broken
implementation, and whether the tests over the touched area would actually catch
a regression. An absent or perfunctory test verdict makes the review incomplete;
ask for it rather than accepting the result.

Keep each review read-only and retain any session handle that allows later
continuation. Accept a result only after the review completed successfully and
clearly identifies the pushed revision it covered. Ensure retries cannot be
mistaken for or consume output from an earlier attempt.

Before launching reviews, set a finite attempt budget and a context-appropriate
overall deadline. Check task or process liveness before retrying, and do not
treat quiet output as failure while a review remains live.

Both engine perspectives are required for the ready gate; do not simulate dual
review with two reviewers from the same engine. If a channel remains unavailable
when its budget or deadline is exhausted, continue with the evidence available
but leave the PR draft and report the coverage gap.

### 7. Reconcile, Fix, and Re-review

Treat reviewer findings as evidence, not authority. Verify each one against the
code, weigh the reviewer independent of the implementer most heavily, and record
concise reasons for dismissals.

Treat a confirmed coverage gap as a finding like any other: close it, or put it
to the user for explicit acceptance. Do not silently reclassify it as residual
risk. Add a regression test for every confirmed behavioral or correctness
failure, unless the user has explicitly accepted a testing exception covering
it; a fix that lands without one repeats the failure the review just caught.

Fix confirmed findings through the same implementer session when practical, then
run checks, commit only the fix scope, and push from the delivery checkout.

Resume the original reviewer sessions for focused fix verification when
possible. Give each reviewer the last revision it accepted, the new verified
remote tip, and concise summaries of the relevant findings. Ensure the reviewer
can access both revisions in the repository checkout it is inspecting, then have
it inspect only the intervening changes and affected paths. Do not paste
generated diffs, long path lists, or prior reports into the prompt.

Require each continued review to complete successfully and identify the new tip
it covered. If continuation is unavailable or invalid, use a fresh reviewer
through the same engine channel. If the fixes materially expand the
implementation beyond the original findings, use fresh reviewers for both
channels and review the expanded scope.

Limit the loop to two fix rounds. Surface anything still open rather than
continuing indefinitely.

### 8. Deliver

Wait for required CI checks that cover the final pushed remote state; ignore
results from earlier pushes. Route actionable CI failures through the same
bounded fix and review loop. Do not mark the PR ready before local delivery is
complete.

Use a context-appropriate deadline, but do not treat pending checks as failed
before they finish or the deadline expires.

Before cleanup, verify in the delivery checkout that:

- the expected feature branch is attached there;
- its head matches the pushed remote branch and tracks the expected upstream;
- all pre-existing staged, unstaged, and untracked changes remain intact;
- the worktree mapping contains no unintended branch attachment.

Only then remove workflow-created worktrees and verify the mapping again. If
handback is blocked, retain the checkout holding the feature branch, keep the PR
draft, and report its path and the blocker. Use another final local destination
only with explicit user acceptance.

Mark the PR ready only when both reviewer channels cover the final state, you
can explain your confidence in the change from test evidence rather than assert
it, every identified test-coverage gap is closed or explicitly accepted by the
user, required CI is green, handback is verified, and temporary checkout cleanup
is safe. Keep it draft while substantive findings, unaccepted test exceptions,
or required user decisions remain unresolved.

Report the PR URL and base, what shipped and any deviations from the approved
plan, review decisions, the new and changed tests with the scenarios they cover,
focused and broader check results and CI, any accepted gaps or still-untested
areas, delivery-checkout path, final branch and revision, upstream state,
preserved pre-existing changes, and any retained checkout or residual risk.
