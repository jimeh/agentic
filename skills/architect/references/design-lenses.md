# Architecture Design Lenses

Use these lenses to compare candidate shapes. They are heuristics, not rules
that override project constraints.

## Interface depth

A deep module hides substantial policy or coordination behind a smaller caller
surface. Judge depth by leverage, not lines of implementation. Include every
fact the caller must know: invariants, ordering, errors, configuration,
performance, and lifecycle.

Apply the deletion test: if deleting a layer makes complexity vanish, it may be
pass-through indirection; if the complexity spreads back across callers, the
module was concentrating useful knowledge.

## Information locality

Prefer one owner for a representation, invariant, protocol decision, or policy.
When several modules must change together because they know the same internal
fact, the seam leaks information. Parse external transport and storage shapes
into domain-owned forms at the appropriate boundary.

Avoid temporal decomposition that separates load, validate, transform, and save
while making every stage understand the same representation. Group behavior by
the knowledge and invariants it owns, even when methods run at different times.

## Test surface

Callers and tests should cross the same meaningful interface. A test that must
reach through the interface may signal a misplaced seam or an implementation
detail asserted as behavior.

Classify dependencies before adding substitution:

- in-process logic may need no adapter
- locally substitutable infrastructure can stay behind an internal seam
- owned remote systems may justify a port plus production and test adapters
- true external systems usually need an injected boundary and controlled fake

One production adapter alone is weak evidence for a new public abstraction. A
test fake can justify substitution when it models a real external boundary, but
do not expose internal seams merely because tests use them.

## Alternative quality

Distinct designs change ownership, interface, data flow, or extension strategy.
Cosmetic variations inside the same structure do not count as alternatives.
Compare whole shapes on caller cost, hidden complexity, locality, verification,
migration, and operational risk. Prefer the simplest shape that satisfies the
observed constraints and makes likely extensions affordable without building
them now.
