---
name: architect
description: >-
  Investigate and design a non-trivial module, interface, ownership boundary, or
  codebase restructuring before implementation. Use for architecture requests,
  design alternatives, seam placement, or a read-only architecture audit.
---

# Architect

Produce a grounded architecture recommendation before code locks in the wrong
shape. Default to read-only investigation and an inline design. Implement or
write durable sketches, reports, ADRs, or domain documents only when the user
explicitly authorizes each relevant artifact. Authorization to implement covers
product code, not those design or domain records.

Use `why` when existing ownership or layering may encode historical constraints,
and `domain-modeling` when the work explicitly includes terminology or ADR
changes. Do not mutate those sources as a side effect of design discussion.

## Choose the Mode

- **Design**: ground one proposed change, compare viable shapes, and recommend
  an interface and module map.
- **Audit**: find architectural friction or deepening opportunities in a named
  scope. If no scope was named, use recent change history to select likely
  hotspots before widening the scan.
- **Design and implement**: complete the read-only design first, then hand the
  settled recommendation to the authorized implementation workflow.

If the user asks to discuss, investigate, audit, or stop before implementation,
finish after the design recommendation.

## Ground the System

Trace the current callers, data flow, state ownership, lifecycle, errors,
external boundaries, tests, and operational constraints. Read relevant domain
language, architecture docs, decisions, and history. Name observed facts,
inferences, and open questions separately.

Start with the caller's experience: realistic usage, inputs, outputs, failure
modes, ordering, configuration, compatibility, and performance expectations.
Treat all of those as part of the interface, not only its type signature.

## Explore Shapes

For a material decision, design at least two structurally distinct shapes before
choosing. Small or heavily constrained changes need only one concrete rejected
alternative. Independent agents can explore alternatives when the decision is
large enough to justify them and the active workflow authorizes delegation; do
not require a fixed model panel.

For material alternatives, read
[references/design-lenses.md](references/design-lenses.md). It contributes
concrete interface-depth, information-locality, test-surface, deletion, and
alternative-quality heuristics for comparing whole shapes.

Deep modules are a useful lens, not a universal architecture. Keep established
repository terms such as component, service, API, or boundary when they are the
clearest local language. Do not introduce an abstraction merely to satisfy a
pattern or a hypothetical future adapter.

## Recommend

Lead with one recommended shape and show the caller usage before internal module
details. Include:

- public interface, including invariants, errors, ordering, and performance
- module and ownership map
- data and control flow through external boundaries
- what complexity is hidden and what callers must still know
- testing and verification seam
- migration sequence and rollback or compatibility constraints
- tradeoffs accepted, rejected alternatives, open questions, and risks

An audit reports a small ranked set of evidence-backed candidates and a top
recommendation. Use HTML only when the relationships materially benefit from a
visual report and the request authorizes that artifact; otherwise answer inline.
Do not propose refactors merely because a module is small.

When implementation was authorized, treat repeated deviations of the same shape
as evidence that the design is wrong. Re-ground and redesign instead of layering
workarounds. Rewrite prototype or sketch code to production standards and verify
the final observable behavior through the chosen interface.

## Source

Adapted from Cursor's pinned
[`pstack` architect skill](https://github.com/cursor/plugins/blob/60c641e4fad674784b30abcf9f8915dea39df38d/pstack/skills/architect/SKILL.md)
and Matt Pocock's pinned
[`codebase-design`](https://github.com/mattpocock/skills/blob/885e2ca4d842d139e9aef4e48d366c63cb1b8013/skills/engineering/codebase-design/SKILL.md)
and
[`improve-codebase-architecture`](https://github.com/mattpocock/skills/blob/885e2ca4d842d139e9aef4e48d366c63cb1b8013/skills/engineering/improve-codebase-architecture/SKILL.md)
skills.
