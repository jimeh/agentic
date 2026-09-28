# Enforceable Invariants

Use this when prose guidance is not enough to keep agent-generated work
coherent.

## Convert Taste Into Checks

Good candidates for mechanical enforcement:

- forbidden imports or dependency directions
- layer boundaries
- schema parsing at external boundaries
- structured logging fields
- file size or module size limits
- public API naming conventions
- generated file freshness
- docs links that must resolve
- required tests for certain file classes
- package ownership or cross-package import rules

Poor candidates:

- subjective copy quality
- product judgment
- one-off migration details
- rules expected to change every week
- conventions with many legitimate exceptions

## Implementation Options

Choose the lightest mechanism that can fail clearly:

- existing linter config
- type system constraints
- unit or structural tests
- shell script invoked by CI
- custom AST/script check
- pre-existing dependency analyzer
- repository-specific CLI command

If a rule needs many exceptions, start with an audit/report command before
making it blocking.

## Agent-Friendly Diagnostics

Write failure messages as remediation hints:

```text
Domain service imports UI code.
Services may depend on repo/providers only. Move UI formatting into the UI
layer or introduce a provider interface.
```

Diagnostics should include:

- what failed
- why the boundary exists
- the expected direction or replacement
- how to inspect similar valid examples

## Rollout Pattern

1. Document the invariant briefly.
2. Add a non-blocking detector or focused test.
3. Fix existing violations or record accepted exceptions.
4. Make the check blocking once the signal is clean.
5. Keep exceptions explicit and grep-able.

Choose incremental enforcement to match the guarantee needed:

- Enable a rule package by package after cleanup when scope can be separated
  soundly. Keep the unenforced scope visible.
- Track individual accepted violations when the tool provides stable identities
  and new occurrences must fail. Check behavior under file moves and code edits;
  an unstable fingerprint can produce noise or hide a new violation.
- Use per-file occurrence ceilings when limiting aggregate growth is sufficient.
  They cannot prevent replacing one old violation with a new one at the same
  count. Reduce allowances as cleanup lands and detect unused headroom where
  practical.
- Keep exceptions centrally discoverable with reasons, and reject obsolete
  suppressions when the tool supports it. Follow project policy for approval;
  make any broadened exception visible in review, especially when it weakens a
  safety or architecture boundary.

A baseline is useful when it bounds or identifies accepted debt, as its
mechanism allows, and can shrink. Avoid blanket exclusions that prevent the
detector from seeing new violations. Verify the selected mechanism against a new
violation, an accepted existing case, and a cleanup. Include a same-count
replacement if the claimed guarantee depends on violation identity.

## Review Feedback Loop

When a review comment repeats, arrives late, or exposes a surprising high-risk
failure, consider whether it should become:

- a lint/test/check
- a code generator or helper
- a doc section with examples
- an AGENTS.md pointer to an existing source of truth

Prefer checks for correctness and architecture. Prefer docs for judgment and
tradeoffs.
