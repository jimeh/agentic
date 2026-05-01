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

## Review Feedback Loop

When the same review comment appears twice, consider whether it should become:

- a lint/test/check
- a code generator or helper
- a doc section with examples
- an AGENTS.md pointer to an existing source of truth

Prefer checks for correctness and architecture. Prefer docs for judgment and
tradeoffs.
