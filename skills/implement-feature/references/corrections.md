# Correction Rounds

Use this reference when making corrections for review findings, or briefing a
worker to make them: code review, UX review, or bot feedback on a pull request.
`babysit-pr` owns whether a round runs and when the loop stops.

Apply the rules below to behavioral findings. A documentation, wording,
presentation, or mechanical finding needs only the fix and the evidence that
closes it, unless the same defect may sit at other sites; then search for them.

## Before Fixing

- **Group findings by mechanism.** Put findings that touch the same state,
  lifecycle, component, or rule in one group, and fix each group as one change.
- **Name the invariant.** For each finding or group, state the rule the code
  must hold and the root cause that breaks it.
- **Enumerate the paths once.** List every path that can break the invariant:
  each operation that writes the state, each variant, and each ordering of
  asynchronous steps that can interleave. Search for other call sites with the
  same pattern.
- **Model shared state before patching it.** When a group touches a state
  machine, write down its states, events, and transitions before changing code,
  and correct the model.

## While Fixing

- Fix at the layer that owns the invariant, not at the call site where the
  scenario surfaced.
- Prefer the smallest change that holds the invariant on every enumerated path.
  When a fix needs a new flag, queue, timer, or bookkeeping structure, say so in
  the report: added machinery usually means the state model is wrong.
- Change no behavior beyond the findings.

## Test the Class

- Cover the enumerated paths, not only the reported scenario: table-driven tests
  over the variants and, for an ordering defect, a deterministic test that holds
  one step at the point where the race occurs.
- Rerun the tests that earlier rounds added. They guard earlier fixes.

## Report

For each finding or group, report the invariant and root cause, the paths
covered and how, the tests added, any behavior changed beyond the findings, and
the earlier fixes the change touches. The follow-up review brief names the last
two as risk areas.

A worker making corrections gets the findings with their evidence, the triage
decisions, and the path to this reference.
