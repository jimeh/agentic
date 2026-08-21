---
name: diagnosing-bugs
description: >-
  Diagnose an unclear bug, failure, flaky behavior, or performance regression
  from a focused falsifiable feedback loop. Use for diagnosis-only work or the
  diagnosis phase of an authorized fix, not when the cause and implementation
  are already settled.
---

# Diagnosing Bugs

Turn an observed symptom into an evidence-backed cause and a reproducible way to
distinguish broken from working behavior. Diagnosis does not imply permission to
fix the bug.

A diagnosis request authorizes read-only inspection, safe scoped local or
explicitly scoped development execution, and temporary reproducers outside the
repository. Editing repository source or adding instrumentation there requires
explicit mutation authority. Persistent tests or source changes, fixes,
production or live-system access, production or durable instrumentation,
commits, pushes, and external posts require separate authorization. Redact
secrets and private data from commands, logs, traces, screenshots, and reports.

## Establish the Symptom

Record the exact observed behavior, expected behavior, affected environment or
revision, frequency, and smallest known trigger. Separate what the user observed
from assumptions about the cause. Read relevant project context, decisions, and
current implementation before choosing a probe.

## Build a Red-capable Loop

Create the tightest proportionate signal that exercises the reported symptom:

- an existing focused unit, integration, or end-to-end test
- a CLI or HTTP invocation with a controlled fixture
- a browser interaction that asserts the relevant DOM, console, or network
  behavior using the environment's browser workflow
- a redacted trace or payload replayed through the real boundary
- a temporary minimal harness, differential comparison, fuzz loop, or automated
  bisection check

Run the command and confirm that it can fail for the user's symptom, not merely
that setup completes. Tighten it for speed, determinism, and signal. For flaky
bugs, measure and raise the reproduction rate rather than demanding certainty.

Static or source investigation may precede the loop when it is the fastest way
to locate the boundary, rule out an unsafe execution, or explain why a faithful
reproducer is unavailable. Do not let it become an untested causal story. If a
loop is disproportionate or blocked, state what was tried, what evidence is
missing, and what artifact or separately authorized access would close the gap.

## Reproduce and Minimize

Confirm that the loop captures the reported failure, then remove inputs,
configuration, services, and steps one variable at a time. Keep only elements
whose removal changes the verdict. Preserve the original scenario so the final
conclusion can be checked against both the minimized case and the user's actual
experience.

## Rank and Test Hypotheses

For a hard or ambiguous bug, write a small ranked set of hypotheses before
committing to one. Each must predict an observable result:

> If X is the cause, changing or observing Y will make Z happen.

Share the list as a non-blocking checkpoint when the user's domain knowledge
could re-rank it. Test one variable at a time. Prefer debugger or REPL
inspection over logs, and targeted boundary logs over broad logging. When
repository instrumentation was explicitly authorized, tag every temporary site
with one unique marker so cleanup is mechanically checkable.

For performance regressions, establish a repeatable baseline and use profiles,
query plans, timing, allocation evidence, or bisection. Avoid adding logs that
change the timing being measured.

Revise or discard a hypothesis when its prediction fails. Do not preserve a
plausible explanation after contrary evidence appears.

## Conclude or Hand Off

For diagnosis-only work, stop after reporting:

- the root cause, or the narrowest supported causal boundary
- the minimized reproducer and exact command or interaction
- evidence that falsified the leading alternatives
- confidence, unresolved uncertainty, and residual environment limits
- a concise fix direction and the regression seam, without applying either

When a fix was explicitly authorized, hand the confirmed diagnosis to the
appropriate implementation workflow. A persistent regression test should
exercise observable behavior at the real bug seam and should fail for the
intended reason before the fix when proportionate. Re-run both the minimized and
original scenarios afterward.

Before completion, remove all temporary instrumentation and verify its unique
marker is absent. Delete temporary reproducers unless the user authorized a
durable artifact. Never claim a fix from a green minimized case while the
original reported scenario still fails.
