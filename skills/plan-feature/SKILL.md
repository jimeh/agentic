---
name: plan-feature
description: >-
  Settle an implementation contract for a non-trivial feature or change before
  code is written: scope, success, failure paths, verification, and, for a
  user-facing change, placement and states. Use when asked to plan a feature,
  or when implement-feature or a delivery workflow needs a contract;
  structural alternatives use architect.
---

# Plan Feature

Turn a requested outcome into a concise contract that an implementer can build
against and a reviewer can check. Ground every decision in the code, not in
assumptions about it.

Planning is read-only. Write the plan to a file only when the user, the host's
plan step, or the owning workflow asks for one.

## Gather the Inputs

Resolve the requested outcome, the base revision, the repository's instructions,
and any existing plan, issue, or specification.

Reuse a user-approved plan when it still matches the code, and plan only the
gaps. When the code moved since the plan was approved, compare the plan's
assumptions with the changes, fill code-grounded gaps, and list the plan's
outdated parts as proposed changes rather than editing its file.

Read the code the change will touch: callers, data flow, state ownership,
lifecycle, errors, external boundaries, tests, and conventions. Fill small,
code-grounded gaps directly. Return material product, scope, behavior, or
architecture choices to the user, unless they explicitly delegated them.

When the shape itself is in question, such as module boundaries or competing
designs, use `architect` first. It recommends a shape; the user chooses unless
they delegated the choice. When the request also asks for a plan, plan on the
recommended shape and make the choice the first open question.

## Write the Contract

Cover:

- **Objective:** the outcome in user or caller terms.
- **Constraints:** repository rules, compatibility, platforms, and performance
  or security limits that bind the design.
- **Approach and scope:** the shape of the change, the modules and files it
  touches, and the key decisions with their reasons. For a common interaction or
  component, name the existing component or established package that provides
  it, or say why none fits.
- **Observable success:** what a user or caller can see or measure when it
  works.
- **Failure paths and risks:** important errors, edge cases, races, and
  migrations, and how each is handled.
- **Non-goals:** what this change deliberately leaves out.
- **Verification:** map each material success, failure, boundary, regression,
  and supported-platform concern to a planned test or other evidence, or record
  it as a non-goal. Apply the global testing rules.
- **Open questions:** anything that still needs a decision, with a
  recommendation.

Keep it concise and scannable, as the global plan rules require.

## Plan the Experience

For a change a user sees or touches, the contract also says:

- where each new control goes, which common pattern or comparable tool it
  follows, and why; put a control where the thing it acts on is;
- how each supported input reaches it: keyboard, pointer, touch, and assistive
  technology;
- what its empty, loading, error, and permission-denied states show, and what
  the rest of the screen does while one of them shows; and
- the sizes, themes, text sizes, locales, and platforms it must hold up at.

Settle these interaction decisions too, because they are expensive to retrofit:
whether the URL or other durable state holds filters, tabs, and selection;
whether a destructive action confirms or offers undo; whether updates are
optimistic and how they roll back; how unsaved changes are protected; how focus
moves through dialogs and menus; what alternative each gesture has; and how
errors appear and offer recovery. Follow the platform's conventions, such as
Apple's Human Interface Guidelines, Material Design, or the Windows guidelines,
and settle the platform checks in the matching `ux-review` surface reference.

For a web UI change, fetch the build-time guidelines that the `ux-review` web
reference names. The contract records which of their interaction, form, and
content-state rules apply and keeps their markup and CSS rules for the
implementer: in the implementation brief when there is one, or applied directly
by whoever implements.

Record any new key binding or other scarce global resource as a decision in the
contract, and follow project rules that reserve them.

## Review the Plan

Have the drafted plan reviewed before it is presented or accepted when the user
or an owning workflow asks, or when the plan is substantial or more complex than
usual and a second reader would likely catch a gap before implementation starts.
Otherwise skip the review. For a reused plan, review the updated parts. One
review covers the whole planning step, including an `architect` pass.

Use the other engine unless the user names one: `codex-analysis` from a Claude
host, `claude-analysis` from a Codex host. Brief the reviewer with the request,
the base revision, the repository instructions, and the draft as a file or in
the brief, but not the planning conversation. Ask for wrong assumptions about
the code, missing scope, unhandled failure paths, and verification gaps, each
with evidence, and tell it not to delegate further.

When the other engine is unavailable, use a fresh same-engine worker as
`implement-feature` describes and say the review was not cross-engine. When
delegation is unavailable or the user declines it, say the plan was not
reviewed. Check each finding against the code before revising the plan, and
carry material disagreements into the open questions.

## Accept and Hand Over

How the contract is accepted depends on the request:

- **A plan alone:** present it with its open questions and stop. Implementation
  needs separate authority.
- **Plan and implement:** accept code-grounded decisions within the authorized
  scope and proceed. Wait for the user only when a material choice is open.
- **A host plan step,** such as Claude Code's plan mode: write the plan where
  the host requires; the user's approval of it accepts the contract.
- **An owning workflow:** the workflow accepts the contract unless a material
  choice is open, which goes to the user.

Once accepted, the contract is frozen. Return material product, scope, behavior,
or architecture changes to the user unless they delegated them, and record minor
implementation deviations with their reasons. Hand over the contract, the
verification map, the fetched guideline rules, and any decisions still open.
