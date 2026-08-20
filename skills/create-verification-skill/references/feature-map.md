# Verification Feature Map

Use a feature map when the product has several distinct user-facing paths whose
verification details would make the entry skill noisy or easy to neglect.

Create `features/README.md` as an index and one concise file per initial
feature. Start with the three to five highest-value surfaces found in routes,
commands, menus, docs, recent changes, or recurring regressions. Do not claim
exhaustive coverage.

Each feature file records:

- what the user is trying to accomplish
- how the user reaches it
- how the verification harness drives it through the real surface
- the observable end state and material side effects that prove it worked
- prerequisites, stable handles, cleanup, and known unreachable states

Use domain language rather than implementation names. Link to current canonical
commands or sources instead of copying details that are easy to discover and
likely to drift.

Treat the map as a coverage index, not a test matrix. A maintenance pass
compares every entry with current source and exercises every reachable feature,
but may combine them into a small number of isolated application sessions. Add a
missing feature only with a concrete user surface and source entry point. Remove
or rewrite entries when the product contract changes.
