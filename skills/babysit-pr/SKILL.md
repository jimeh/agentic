---
name: babysit-pr
description: >-
  Maintain an existing PR the user owns or has taken over: monitor checks,
  address feedback, or publish requested comments. Use for PR stewardship and
  bounded post-filing actions; never infer merge authority.
---

# Babysit PR

Own post-filing interaction and maintenance for an existing pull request that
the user authored or has taken over from someone else; treat both the same. For
a bounded request such as posting a single comment or set of review findings,
resolve the target, verify the content and revision when relevant, publish it
with the attribution required below, report the result, and stop. Do not enter
the maintenance loop, change code, or act on unrelated PR state unless the user
requested broader stewardship.

A broader invocation authorizes relevant code fixes, proportionate validation,
commits, normal pushes to the PR branch, human-facing comments and replies,
thread resolution, and draft-to-ready transition needed to reach the requested
condition. It does not authorize force-pushing, dismissing human reviews,
merging, deploying, or releasing.

## Establish the Target

Resolve the requested PR or the PR for the current branch. Capture its URL,
base, remote head SHA, head branch, draft state, review decision, merge state,
checks, reviewers, and repository-specific requirements.

Use the existing PR, branch, and checkout as authoritative. Snapshot local
staged, unstaged, and untracked work before changing anything. Preserve
non-overlapping dirt exactly and stop when local work conflicts with the PR
branch or requested corrections.

Translate the user's request into a completion condition. When they simply ask
to get the PR ready, require the current head to have green required checks, no
valid unresolved blocking feedback, satisfied required reviews, a mergeable
branch, and non-draft state. Never infer permission to merge.

Honor explicit user correction budgets, and with or without one continue
authorized fixes only while review rounds converge, as Check Convergence
defines. Reassess repeated unsuccessful attempts and escalate stalled progress,
material scope changes, or new authority needs. Batch related fixes.

Inherit review requirements from the user, repository, or explicitly selected
workflow. Do not initiate independent review merely because babysitting was
requested. Use dual-review only when the user requested it or selected
ship-feature-pr; preserve that requirement for justified continuation.

## Build a Current Review Picture

For each candidate head, gather checks, review records and their commit ids,
general discussion, and thread-aware inline feedback. Flat comment or review
lists do not establish thread resolution. Refresh state after every wait or push
and ignore approvals or checks bound only to superseded heads.

On the initial snapshot, fetch enough history to identify every unresolved
concern, but build the active queue from current state rather than replaying all
comments. Treat resolved threads, explicitly closed concerns, and outdated
comments whose referenced code no longer applies as historical. Keep older
feedback only when it remains unresolved and still applies to the current code;
age or an older reviewed revision alone does not close it.

After the initial snapshot, fetch new comments and reviews since the last
observation together with the complete unresolved-thread set and current review
state. Use later commits, replies, rereviews, and explicit resolution signals to
reconcile relevance. Do not repeatedly process unchanged historical comments.

Include caller-supplied findings, evidence, reviewed revisions, and local
reviewer sessions even when they are not represented on GitHub. Preserve their
source and revision while reconciling them with the current PR state.

Use provider-specific skills when a selected bot has special triggering or
closure rules. In particular, use `coderabbit-review` for CodeRabbit rather than
duplicating its command and approval mechanics here.

Deduplicate feedback by underlying concern and classify it as valid, needs a
decision, already addressed, invalid, or optional. Verify claims against the
current code. Treat reviewer feedback as evidence, not authority, and explain
dismissals briefly.

## Address a Review Round

Resolve user or product decisions before editing. Batch confirmed fixes, then
use the repository's normal implementation and validation workflow. Add or
adjust tests when the concrete regression risk justifies them; otherwise record
the focused static, build, runtime, or manual evidence that closes the concern.

Use `commit` for every correction commit and push normally. Preserve earlier
test and review evidence when its revision is an ancestor and the new delta
cannot invalidate it. Choose follow-up review by affected risk:

- Inspect and verify obvious documentation, hygiene, mechanical, or test-only
  corrections directly.
- Ask the relevant reviewer to verify a localized production or subtle fix.
- Re-run all required independent perspectives only for architecture, public
  contracts, security, authentication, persistence, concurrency, lifecycle,
  supported-platform behavior, material scope expansion, or another delta that
  invalidates all prior reasoning. Use `dual-review` continuation when the
  caller requires both Codex and Claude coverage.

Scope every follow-up review as `review-code` prescribes for follow-up rounds.

When the user supplied a correction budget, count bot-driven corrections too. Do
not wait for or debug CI on a head that another known fix will supersede.

## Check Convergence

A correction round is one batch of fixes made in response to review findings.
Fixes for CI failures and merge conflicts are not correction rounds. Closing a
round's findings does not show that the PR is converging, because each fix is
new code that the next review can fault.

These rules govern only the loop of corrections and the reviews that verify
them. They never cancel a required review that has not run, the closure of a
reviewer's blocking state, or the review a later delta needs under Address a
Review Round.

A finding is material when `review-code` would accept it as confirmed, its
trigger occurs in supported use, and it is more than a hardening suggestion or
optional improvement. That includes a breach of a stated requirement, briefed
invariant, or repository rule, and a validation gap `review-code` would accept.
Supported use covers every input the component can receive, hostile input
included, and excludes cases that nothing can supply. From the second correction
round on, fix only material findings from agent and bot reviewers. Report their
other concerns as accepted residual risk or follow-up work, however cheap the
fix looks. A human reviewer's request still gets a fix or a reply.

When the review that follows a second or later correction round produces valid
findings, classify them before fixing anything. A finding is correction-caused
when it lies in code a correction added or rewrote, or when it traces to a
correction that made earlier code wrong. Take the first outcome that fits:

1. **Diminishing:** no finding is material. End the loop: fix none of these
   findings, request no further review of the corrections already made, and
   report the findings as accepted residual risk or follow-up work.
2. **Churning:** a material finding is correction-caused, and the previous
   review also found a correction-caused defect in the same component, rule, or
   state. Stop fixing it one finding at a time. Restate the requirement and
   invariant it must hold, enumerate its states or cases once, and look for a
   simpler design, including removing a mechanism an earlier correction added.
   Make one consolidated correction that also covers any other material
   findings. Then have the reviewers this workflow already requires review the
   whole component afresh, not as a follow-up of the delta. When it requires
   none, verify the rethink directly and say so in the report.
3. **Converging:** anything else. Run another round.

Proceed with a rethink that keeps the PR's stated scope and behavior. Ask the
user first when it would change scope, user-visible behavior, or a requirement,
or when it means accepting a known limitation.

Ask the user when the review of a rethought component still finds a material
defect in it. Without an explicit user budget, also ask before a fifth
correction round whatever the outcome, and again after every two further rounds
when the user authorizes more without a number. An explicit budget replaces only
that count: the materiality rule, the classification, and the rethink still
apply within it. When asking, leave the PR in its safe current state and report
the outcome, the remaining findings, and the options: narrow or split the PR,
accept documented risk, or authorize further rounds.

## Reply and Resolve

Reply when it helps reviewers understand what changed or why no change is
warranted; avoid rote acknowledgements on every thread. Start every
agent-authored human-facing top-level comment, review body, inline comment, or
reply with the comment line from the GitHub attribution style in the global
instructions.

Resolve a thread only after verifying its concern is fixed, invalid, or already
satisfied on the current head. Leave unresolved anything still valid or
uncertain. Never clear review state cosmetically.

## Wait and Finish

Start independent external review and CI concurrently on a settled candidate
when both are required. For external waiting, read
[PR monitoring](references/monitoring.md) and use `agent-pr-monitor` to filter
unchanged state without model calls. Prefer running it directly in the parent;
delegate only when substantive triage or follow-up work benefits from another
model. A bounded comment-posting request does not need monitoring.

Use changed identifiers and links to select feedback bodies and failure logs
that need inspection. Reconcile them with the current head, complete unresolved
thread set, and review state before acting. Check liveness before retrying a bot
or job. A monitor event reports an observation, not readiness or permission to
merge; refresh the exact remote head and required gates before finishing.

Route actionable CI failures and new feedback through the same bounded loop. If
an explicit user budget is exhausted or repeated attempts make no progress, a
required reviewer is unavailable, a user decision is needed, permissions fail,
or external state cannot progress, leave the PR in its safe current state and
report the blocker.

Mark a draft ready only when the requested completion condition holds on the
exact remote head. Report the final SHA, checks, review decision, unresolved
thread count, fixes and replies made, each convergence outcome with the findings
it deferred, preserved local work, remaining risk, and whether the PR is ready.
Merge only when the user separately and explicitly authorizes it.
