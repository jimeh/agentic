---
name: code-review
description: >-
  Review code changes against requirements and return verified findings with a
  separate validation and test-quality verdict. Use for direct reviews and as
  the shared review standard for reviewer and orchestration skills.
---

# Code Review

Own review judgment, not the reviewed change. Remain read-only: do not edit
files, commit, push, post feedback, or mutate a pull request. Temporary
artifacts, safe ref fetches, and isolated review checkouts are acceptable, but
leave the caller's checkout and local work unchanged.

When another skill invokes this one, this skill owns the review brief,
inspection standard, finding acceptance, revision coverage, and report. Provider
skills own reviewer transport and process lifecycle; orchestration skills own
reviewer independence and synthesis.

When the user also authorizes fixes or pull-request stewardship, complete the
review first and hand confirmed findings to that workflow rather than absorbing
its responsibilities.

## Pin the Target and Brief

Resolve the repository, applicable instructions, review scope, requirements, and
exact target. For committed changes, record immutable base and head revisions.
For uncommitted work, record the base revision and snapshot staged, unstaged,
and untracked state so later movement is detectable. For a pull request, also
capture its URL, state, changed files, and available check evidence.

Avoid switching the caller's checkout; fetch safely or use a temporary checkout
when needed. Build a compact brief containing:

- repository, exact target, and scope;
- the user request and available specification, issue, or pull-request
  description;
- material invariants, risks, and non-goals; and
- existing validation evidence with its revision and environment limits.

State assumptions when requirements are incomplete. Do not derive a broader
contract from the implementation alone.

## Inspect the Change

Read the requirements before judging the implementation. Inspect the complete
diff and the changed code in context, including relevant callers, boundaries,
tests, and configuration. Follow risk into unchanged code when needed, but do
not expand into an unrelated repository audit.

Look for requirement mismatches, correctness defects, edge cases, security and
authorization failures, unintended behavior, compatibility regressions, and
maintainability problems with a concrete future failure mode.

Assess validation separately from implementation correctness. Decide whether the
supplied evidence is proportionate to the change's risk and whether material
success, failure, boundary, and regression scenarios are covered. For changed
tests, check that assertions observe behavior, external boundaries are mocked
only where needed, and the tests are deterministic and capable of failing over a
broken implementation.

Use an inspection-first execution policy. Do not repeat broad suites, builds,
lint, or CI-equivalent checks already covered by valid revision-bound evidence.
Run focused reproducers only to investigate a concrete suspected defect or
material evidence gap, and report the command and result.

## Accept Findings from Evidence

Treat each observation as a candidate until the code, requirements, or
observable behavior supports a concrete failure path. Verify cited locations and
relevant assumptions. Discard vague, speculative, purely stylistic, or
non-actionable suggestions unless they expose material risk.

For each confirmed finding, provide severity, file and line, triggering
conditions, concrete impact, and a concise fix direction. Order severity by user
and system impact plus realistic likelihood, not reviewer emphasis. Treat a
validation gap as a finding only when it leaves material behavior or risk
unclosed.

Keep plausible but unverified concerns separate from confirmed findings. Say
explicitly when there are no substantive findings. Always provide a separate
validation and test-quality verdict, even when the implementation has no other
findings; an absent or perfunctory verdict makes the review incomplete.

## Preserve Coverage and Currentness

At the end, compare the reviewed target with the current target. If committed
base or head revisions moved, or the captured uncommitted state changed, report
the review as stale rather than silently chasing the new state or claiming
current coverage.

Continue an earlier review only when its session and revisions remain available,
each prior revision is an ancestor of its new counterpart, and the scope is a
genuine continuation. Inspect the effects of both base and head deltas and
identify the new pair covered. Use a fresh review when revision identity or
incremental coverage is uncertain or scope materially broadened.

## Report

Lead with confirmed findings ordered by severity. Then give the exact target
reviewed, whether it still matches the current target, the validation and test
verdict, unresolved concerns, and residual risk. Explain dismissed material
suggestions when another reviewer or caller supplied them. Do not imply that a
check ran unless the evidence shows it did, and never describe partial or stale
coverage as a completed current review.
