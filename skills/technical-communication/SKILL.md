---
name: technical-communication
description: >-
  Draft, revise, or audit substantial technical documents when requested or
  invoked by an artifact-writing skill.
  Use for plans, specifications, documentation, and handoffs, not routine replies
  or progress updates. Specific artifact skills own their workflows.
---

# Technical Communication

Make the artifact easy for its intended reader to understand, evaluate, and act
on. Treat user instructions, project terminology, existing templates, and
repository-specific style as authoritative over this skill.

Choose the working mode before writing:

- **Draft:** create a new artifact from the available evidence and requirements.
- **Revise:** improve an existing artifact without changing protected meaning or
  structure unless the request calls for that change.
- **Audit:** including when the user asks for a review, return prioritized,
  evidence-backed findings only. Do not rewrite the artifact unless the user
  also asks for a revision.

## Start From the Reader and Purpose

- Identify the intended reader, what they already know, and the decision or
  action the artifact must support.
- Establish the artifact type before choosing its structure. Do not turn every
  deliverable into a tutorial, plan, or stock template.
- When revising, protect facts and claims; qualifications and modality such as
  `can`, `might`, `should`, and `will`; quotations and links; exact technical
  tokens; required structure; and the author's voice. Change them only when the
  request or verified evidence requires it.
- Surface substantive gaps instead of silently inventing missing facts,
  requirements, or decisions.
- Match depth to consequence. A short status update and a public technical
  specification need different levels of context and precision.

## Compose for understanding

Apply the base writing rules. For technical documents, also:

- Disambiguate actors, pronouns, requirements, and modality. State whether an
  action is required, recommended, optional, or merely possible.
- Put conditions before the actions they qualify when this helps readers decide
  whether instructions apply. Define necessary jargon and use meaningful links.
- Separate observations, inferences, recommendations, decisions, and unknowns.
  Label proposals, future work, and version-specific or time-sensitive claims.
- Write for a global audience without cultural assumptions, unnecessary
  gendering, ableist language, or instructions relying only on visual position.

## Load Only the Relevant Guidance

- For an implementation or execution plan, read
  [references/plans.md](references/plans.md).
- For a technical specification, design document, or RFC, read
  [references/specifications.md](references/specifications.md).
- For a README, guide, tutorial, reference page, or troubleshooting document,
  read [references/documentation.md](references/documentation.md).
- For a progress update, final response, explanation, investigation report,
  review summary, or handoff, read
  [references/agent-messages.md](references/agent-messages.md).

For PR and GitHub issue copy, apply this core guidance under write-pr-copy or
write-issue-copy. Do not load a plan or specification reference merely because
an issue proposes future work.

When another skill owns the deliverable or workflow, follow that skill first and
use this guidance only for gaps it leaves open. Read
[references/google-style-notes.md](references/google-style-notes.md) only when
maintaining or adapting this skill. Read
[references/google-style-index.md](references/google-style-index.md) only when
maintaining the distillation, answering a specialized Google-style question, or
performing an explicitly requested Google Style Guide compliance check. Ordinary
writing tasks need neither research reference.

## Check the Result

Verify that the opening establishes the purpose or result, claims and examples
match the evidence, protected meaning remains intact, and the reader can find
the next action or acceptance condition. Check that structure fits the content
and required destination rather than a habitual template.

Stop when further editing would merely shorten, homogenize, or restyle the
artifact rather than improve meaning, clarity, or usefulness.
