# Technical specifications

A specification defines what must be true about a system or behavior. A plan
defines the work required to build and verify it. Keep them separate unless the
requested artifact explicitly combines both.

## Identify the kind of specification

Determine which concerns the document must settle:

- A **behavioral specification** defines observable behavior and acceptance
  boundaries without prescribing an implementation.
- A **design specification** defines components, interfaces, invariants, data
  flow, and consequential tradeoffs.
- An **implementation specification** records a chosen mechanism when that
  mechanism matters to interoperability, migration, operations, or review.

A document can combine these modes, but make the boundary visible. Do not hide
design decisions inside apparently neutral behavioral requirements.

## Ground the contract

- Establish the problem, intended outcome, audience, actors, scope, and material
  non-goals.
- Define terms whose meaning affects requirements. Reuse the project's domain
  language rather than introducing near-synonyms.
- Distinguish current behavior, proposed behavior, user-settled decisions,
  verified constraints, assumptions, and open questions.
- Inspect the relevant code, interfaces, documentation, standards, or observed
  behavior before presenting them as the current contract.
- Do not invent requirements to make the specification appear complete. Mark
  missing product decisions explicitly.

## Specify behavior and boundaries

- State requirements and invariants precisely enough to produce independent
  implementation and test decisions.
- Describe inputs, outputs, state transitions, ownership, ordering, error
  behavior, and failure recovery where they materially affect the contract.
- Select risk domains that apply rather than forcing every specification through
  a universal checklist. Possible domains include API compatibility, data and
  migrations, concurrency, lifecycle, security and privacy, accessibility,
  internationalization, performance, observability, and operations.
- Describe edge cases that change behavior. Avoid exhaustive permutations that
  do not affect the design or acceptance criteria.
- Keep implementation freedom where multiple mechanisms satisfy the contract.
  Include implementation detail when omitting it would make interoperability,
  correctness, migration, or operational behavior ambiguous.

## Use normative language deliberately

Follow an established project convention when one exists. Otherwise:

- use `must` or a direct declarative requirement for required behavior;
- use `can` or `may` for permitted or optional behavior;
- distinguish an expected outcome from one that is merely possible; and
- avoid treating `should` as a requirement when its optionality is unclear.

Do not claim formal RFC 2119 conformance unless the document explicitly adopts
it. Consistent plain language is usually sufficient.

## Record decisions and acceptance

- State settled decisions directly and preserve the rationale needed to
  understand their constraints.
- Summarize rejected alternatives only when the tradeoff is consequential or
  likely to be reopened.
- Make acceptance criteria observable and traceable to the material
  requirements. Avoid criteria such as "works correctly" or "is performant."
- Describe validation at the contract level. Put sequencing, task ownership, and
  routine implementation commands in the plan instead.
- End with unresolved questions only when they are genuinely unresolved. Name
  their effect on scope or implementation readiness.

Before finishing, check that the specification is complete in proportion to its
risk, avoids premature detail, and gives implementers and reviewers the same
understanding of what constitutes a correct result.
