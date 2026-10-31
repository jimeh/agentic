# Correction Rounds

Use this reference when making corrections for review findings, or briefing a
worker to make them: code review, UX review, or bot feedback on a pull request.
It covers how a fix is made so that it closes the finding without creating the
next one. `babysit-pr` owns whether a round runs and when the loop stops.

Apply the rules below to behavioral findings. A documentation, wording,
presentation, or mechanical finding needs only the fix and the evidence that
closes it, unless the same defect may sit at other sites; then search for them.

Corrections cause most late review findings. A fix that matches the reported
scenario leaves other paths to the same defect open, and a fix to shared state
adds orderings that the next review faults. Each rule below targets one of
those.

## Before Fixing

- **Group findings by mechanism.** Put findings that touch the same state,
  lifecycle, component, or rule in one group, and fix each group as one change.
- **Name the invariant.** For each finding or group, state the rule the code
  must hold and the root cause that breaks it. A finding understood only as its
  scenario is not ready to fix.
- **Enumerate the paths once.** List every path that can break the invariant:
  each operation that writes the state, such as create, rename, delete, reset,
  and reload; each variant, such as theme, component, platform, and input; and
  each ordering of asynchronous steps that can interleave. Search for other call
  sites with the same pattern.
- **Model shared state before patching it.** When a group touches a state
  machine, such as queued writes, pending operations, drafts, or reload
  reconciliation, write down its states, events, and transitions before changing
  code, and correct the model. Do this in the first round. The Churning outcome
  in `babysit-pr` asks for the same rethink, but only after two rounds of
  correction-caused defects.

## While Fixing

- Fix at the layer that owns the invariant, not at the call site where the
  scenario surfaced.
- Prefer the smallest change that holds the invariant on every enumerated path.
  When a fix needs a new flag, queue, timer, or bookkeeping structure, say so in
  the report: added machinery usually means the state model is wrong, and the
  group needs the modeling step above.
- Change no behavior beyond the findings. When a fix must, record what changed.

## Test the Class

- Cover the enumerated paths, not only the reported scenario: table-driven tests
  over the variants and, for an ordering defect, a deterministic test that holds
  one step at the point where the race occurs.
- Where the global testing rules call for it, show a new test failing without
  its fix.
- Rerun the tests that earlier rounds added. They guard earlier fixes.

## Report

For each finding or group, report the invariant and root cause, the paths
covered and how, the tests added, any behavior changed beyond the findings, and
the earlier fixes the change touches. The follow-up review brief names the last
two as risk areas.

## Brief a Worker

A worker making corrections gets the findings with their evidence, the triage
decisions, the requirements unchanged from the first round, the earlier rounds'
findings and invariants, and the path to this reference. Write its rules into
the brief when the worker cannot read the file.
