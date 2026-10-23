---
name: ship-feature-pr
description: >-
  Deliver a non-trivial feature through implementation, dual review, and a ready
  PR. Use only when the user explicitly selects ship-feature-pr.
---

# Ship Feature PR

Deliver a feature as a reviewed, ready pull request. Invocation authorizes the
planning, branch, worktree, implementation, commit, push, draft PR, internal
review, correction, and readiness mutations named here. It does not authorize
merging, deploying, or releasing.

Do not infer this workflow from requests to implement, file a PR, or babysit.
Use the ordinary implementation, commit, file-pr, and babysit-pr workflows for
those requests unless the user explicitly selects this skill.

## Preserve the Delivery Checkout

Treat the checkout active at invocation as the delivery checkout and final local
home of the feature branch. Record its path, branch or detached head, current
revision, root-versus-linked status, worktree mapping, and complete dirty-state
snapshot before mutation.

Preserve unrelated, non-overlapping local work exactly. Stop when existing work
overlaps the feature, makes a branch move unsafe, or leaves ownership ambiguous.
Do not stash, discard, normalize, or silently absorb it.

Use a temporary orchestrator checkout only when a concrete Git or environment
constraint makes delivery from the invocation checkout unsafe. Retain whichever
checkout is the only safe home of the feature branch until handback succeeds.

## Settle Scope and Evidence

Resolve the remote base and run the preflight below, then use `plan-feature` to
settle and freeze the implementation contract, including its verification map
and, for a user-facing change, its experience decisions. Ask it for a plan file
when the implementer will need one. Material product, scope, or architecture
choices go back to the user unless they explicitly delegated them.

Apply the global testing and verification rules. Keep a compact revision-bound
evidence ledger: command or observation, scope, outcome, behavior proved, test
names or count when relevant, and environment limits. Evidence carries forward
only when its revision is an ancestor and the intervening delta cannot affect
what it proves.

Use `show-me-your-work` when the user requests a decision trail or when a long,
multi-phase, or unattended delivery develops material forks, pivots, reversals,
accepted risks, or blockers that the pull request and evidence ledger would not
make easy to reconstruct. Keep its trail temporary by default and separate from
the evidence ledger. Do not log routine commands or commit the trail without
explicit authorization.

Before implementation, verify repository and base access plus both channels
required by `dual-review`. If either engine remains unavailable, stop before
mutation when practical; if it fails later, retain the draft and report the
coverage gap. For a user-facing change, also confirm that the app can run in a
local or test environment for `ux-review`, and report that coverage gap the same
way when it cannot. When its review will need computer use or other real-desktop
automation, ask for that confirmation now, while the user is present; it covers
this run's reviews.

Honor explicit user correction budgets. With or without one, apply the Check
Convergence section of `babysit-pr` to every correction round, including rounds
on internal review findings that precede the babysitting handoff. Reassess
repeated unsuccessful attempts; ask for a decision when progress stalls, scope
materially expands, or the next step requires new authority.

Include an external PR reviewer when the user or repository requires it. When a
change is complex, large, architectural, security-sensitive, concerned with
authorization, persistence, concurrency, lifecycle, multiple platforms, or
otherwise benefits materially from another perspective, recommend one and ask
once before invoking it. Otherwise omit external review by default. The
`dual-review` gate below remains required.

## Implement and Integrate

Prepare the feature branch in the delivery checkout from a refreshed and
verified base. Commit any tracked, feature-owned plan separately when it must be
available to the implementer.

For non-trivial work, use a fresh same-engine implementer. By default, let one
implementer edit the delivery checkout so its changes remain directly visible.
This workflow's topology choice is authoritative over a delegated implementation
skill's generic default; the concrete isolation conditions below still apply.
Give it exclusive mutation ownership of that checkout until it hands control
back: the orchestrator may inspect files and diffs, but must not edit files,
mutate Git state, or run potentially mutating commands concurrently. Require the
implementer to leave Git operations to the orchestrator. If another writer
appears, pause and account for the resulting state rather than guessing
ownership.

Use a separate worktree and branch for each implementer when multiple
implementers run concurrently. Also isolate a single implementer when another
actor must mutate the delivery checkout while it runs, or when the feature
scope, local dirt, or broad tooling makes change attribution unsafe.
Non-overlapping intake dirt alone does not require isolation. Keep
implementation in the delivery checkout when destructive validation can run
safely in its own disposable checkout after handoff. If that need arises while
shared implementation is still moving, pause and capture it before validation or
switch to isolation; otherwise isolate upfront when resets, perturbations,
generated-output cleanup, watchers, services, or other environment state make
that materially safer. Worktrees do not isolate shared processes, ports, caches,
or external state; provision those separately when needed.

Direct implementation by the orchestrator is acceptable when the change is small
enough that delegation adds more overhead than perspective. Give any implementer
the settled contract and focused verification expectations. For a user-facing
change, those include checking the change in the running app at the sizes and
themes the contract names. For a web UI change, put the guideline rules the
contract settled, with the markup and CSS rules from the same fetch, in the
implementer's brief, so they shape the code rather than only its review.

The implementer owns focused tests and checks while building. The orchestrator
owns inspection and evidence sufficiency, filling only missing or invalidated
evidence. Reviewers inspect independently and run focused reproducers only for
concrete suspected defects. CI owns the clean-environment and repository-wide
gates it actually runs.

When the implementer hands back control, account for every changed and untracked
path against that checkout's starting baseline: the intake snapshot for shared
work, or the recorded clean starting state for an isolated worktree. Inspect the
complete diff and evidence, and send settled corrections back through the same
session when practical. In the delivery checkout, use `commit` to create the
feature commit with explicit feature-owned scope. Before and after each feature
commit, compare non-feature staged, unstaged, and untracked state with the
captured baseline. Stop before push if any unrelated state changed.

For isolated work, capture the complete result on its implementation branch
before moving it. Record the delivery tip from which each implementation branch
started and verify that the branch descends from it. If the delivery head has
advanced, reconcile the implementation branch onto the current delivery head
before integration. Integrate without sweeping in unrelated delivery-checkout
changes, but never move, reset, or remove another implementer's active branch or
checkout. Keep the implementation worktree and session until handback.

For later corrections, reuse the implementer when practical. A shared-checkout
implementer continues from the current delivery head. Realign an isolated
implementation branch to the landed delivery head only after all previous work
has been safely captured. Use a disposable worktree for destructive validation
even when implementation itself occurred in the delivery checkout. Create it
from a captured revision after shared-checkout handoff; do not copy or perturb a
moving uncommitted implementation concurrently.

## Review the Experience

When the change has a surface a user sees or touches, run `ux-review` on the
committed feature head after the implementer's running-app check. It owns the
review environment, the reviewer brief, triage, and the re-check. Send its
accepted findings to the implementer as one batch, commit the corrections, and
let its re-check confirm them before filing, so `dual-review` covers the
corrected code in its first pass. Carry its decisions and deferred follow-ups
into the PR description, and keep its brief, findings, decisions, and UX
correction commits for later rounds. When applying Check Convergence, count UX
correction rounds separately from code-review rounds, so the first `dual-review`
findings are not treated as a later round. An explicit user correction budget
and the fifth-round checkpoint count batches across both streams unless the user
scopes them otherwise.

When the change has nothing a user sees or touches, skip this step and say so in
the report.

## File the Draft PR

Use `file-pr` to push the delivery branch and create a draft pull request. Its
`write-pr-copy` dependency owns the title, description, template, and provenance
footer.

Record the pushed head SHA. Start CI and `dual-review` concurrently when
practical, but treat CI as a delivery gate only on the intended final head.

## Run Independent Review

Use `dual-review` against the pushed exact head. Supply the repository, base and
head revisions, condensed feature contract, evidence ledger, and any UX
correction commits as a risk area, and ask it to retain resumable reviewer
sessions for follow-up.

Accept only complete Codex and Claude coverage of the intended revision. Recheck
the reconciled findings against the feature contract, then batch all confirmed
findings into one correction round. Keep the PR draft when either review channel
failed or the live head lacks adequate continuation coverage under the policy
below. A new SHA alone does not invalidate unaffected evidence.

## Babysit to Readiness

Hand `babysit-pr` the open draft, reconciled internal findings, reviewed
revisions and resumable session handles, evidence ledger, correction rounds
already completed with their convergence outcomes, the `ux-review` brief,
findings, and decisions, and any explicit user correction budget. Local reviewer
findings remain actionable even when they are not represented on GitHub. That
skill owns checks, feedback rounds, fixes, replies, thread resolution, normal
correction commits and pushes, exact-head monitoring, and the final
draft-to-ready transition.

Choose follow-up internal review by what the correction invalidates:

- orchestrator verification for obvious documentation, hygiene, mechanical, or
  test-only corrections;
- the relevant original reviewer for a localized production or subtle fix; and
- `dual-review` continuation for architecture, public contracts, security,
  authentication, persistence, concurrency, lifecycle, supported-platform
  behavior, material scope expansion, or another change that invalidates both
  reviews.

Add a `ux-review` re-check, carrying its original brief, findings, and
decisions, when a correction changes what a user sees or how they interact with
it, and name that correction as a UX risk area in the code follow-up review.

When an external reviewer was selected, use its provider-specific skill once on
an internally accepted candidate rather than on every push. Feed its findings
through the same convergence rules and `babysit-pr` loop. Keep technical
verification separate from clearing a provider's blocking GitHub review state.

## Hand Back

Before marking the PR ready, verify that the exact remote head has all required
CI and composed review coverage, including any required `ux-review` re-check, no
valid blocking feedback remains, material risks are closed or explicitly
accepted, and the delivery checkout safely holds the expected branch with the
intended upstream.

Remove only workflow-created worktrees and implementation branches, and only
after the delivery branch is safely handed back. Preserve the intake dirty-state
baseline. If handback or cleanup is unsafe, retain the branch and draft PR and
report the blocker.

Report the PR URL and base, final head, shipped scope and deviations, review
outcomes including the UX review or why it was skipped, proportionate
verification, accepted risk, correction pushes, final checkout and branch,
cleanup, and preserved local work. When a decision trail was used, include its
material pivots, unresolved flags, path, and lifecycle. Leave merging to a
separate explicit user instruction.
