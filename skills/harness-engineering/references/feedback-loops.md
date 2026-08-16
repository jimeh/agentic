# Feedback Loops

Use this when agents need to validate their own work instead of relying on human
inspection.

## Contents

- [Core Loop](#core-loop)
- [Local Dev](#local-dev)
- [Evidence Ownership](#evidence-ownership)
- [UI Validation](#ui-validation)
- [Observability](#observability)
- [CI and PR Recovery](#ci-and-pr-recovery)
- [Review Harvest](#review-harvest)
- [Proof Artifacts](#proof-artifacts)

## Core Loop

```text
observe -> change -> run -> inspect -> fix -> prove
```

The harness should make each step available from the repo with clear commands.

Use the cheapest useful loop first. Narrow changes usually need targeted checks,
not a full project run.

## Local Dev

Useful affordances:

- one command to install dependencies
- one command to install local git hooks when hooks are used
- one command to start required local services
- targeted commands for changed packages
- fast format, lint, and typecheck commands
- deterministic seed data or fixtures
- teardown commands for services and temp state
- per-worktree ports or isolated state when parallel work is common

Recommended command tiers:

- Targeted format, lint, typecheck, and tests give early feedback while editing.
- Pre-commit runs the sound subset that stays fast on a warm checkout.
- `check` combines fast deterministic checks for normal handoff.
- `test` runs the normal test suite or default unit tests.
- `verify` runs broader pre-handoff checks when warranted and not discouraged by
  project instructions.
- CI owns platform, integration, and other coverage that is impractical locally.

## Evidence Ownership

Assign each sensor an earliest sound trigger, scope, approximate cost, and
evidence owner. Reuse the same underlying task across tiers, but do not manually
repeat an identical broad check unless the later run adds coverage, the earlier
run was bypassed, or a failure needs diagnosis.

Hooks normally own staged formatting and linting. A whole-project typecheck may
also belong there when its warm runtime fits the hook budget; otherwise keep it
in `check`. Do not typecheck only staged files when cross-file dependencies make
that result unsound. Keep CI or an explicit handoff task authoritative because
hooks can be bypassed.

## UI Validation

For web or desktop apps, expose:

- browser automation instructions
- stable test routes or fixture accounts
- screenshot or video capture commands
- smoke journeys for critical flows
- accessibility and console-error checks
- instructions for reading app/runtime logs

Do not require agents to infer hidden QA flows from product behavior.

## Observability

Make signals queryable when they matter:

- logs with useful levels and request/task IDs
- metrics for startup, latency, queue depth, or error rate
- traces for multi-service flows
- local dashboards only if agents can query or inspect them
- documented commands for common failure investigations

Simple projects may only need logs and targeted tests. Add metrics/traces when
they answer questions agents cannot answer cheaply otherwise.

## CI and PR Recovery

Agent-ready CI has:

- clear check names
- commands that map from CI to local reproduction
- logs accessible through standard tooling
- known flaky-test policy
- fast targeted checks for normal changes
- slower full checks reserved for release or broad changes

When CI fails repeatedly, improve the harness rather than only patching the
current failure.

## Review Harvest

After review, classify accepted findings as task-local, documentation-worthy, or
mechanically enforceable. Repetition is a strong signal, but a single late,
surprising, or high-risk finding can justify a regression test, lint, or concise
project instruction immediately.

## Proof Artifacts

For complex bugs or UI work, ask agents to preserve concise proof:

- failing command before fix
- passing command after fix
- screenshot/video before and after
- log excerpt showing corrected behavior
- test name added for the regression

Keep artifacts out of commits unless the project expects them.
