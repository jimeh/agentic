# Feedback Loops

Use this when agents need to validate their own work instead of relying on human
inspection.

## Core Loop

```text
observe -> change -> run -> inspect -> fix -> prove
```

The harness should make each step available from the repo with clear commands.

## Local Dev

Useful affordances:

- one command to install dependencies
- one command to start required local services
- targeted commands for changed packages
- deterministic seed data or fixtures
- teardown commands for services and temp state
- per-worktree ports or isolated state when parallel work is common

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

## Proof Artifacts

For complex bugs or UI work, ask agents to preserve concise proof:

- failing command before fix
- passing command after fix
- screenshot/video before and after
- log excerpt showing corrected behavior
- test name added for the regression

Keep artifacts out of commits unless the project expects them.
