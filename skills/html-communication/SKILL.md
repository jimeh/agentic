---
name: html-communication
description: >-
  Create or update standalone dark-mode HTML pages when visual hierarchy,
  spatial layout, comparison, diagrams, or interaction would communicate ideas,
  concepts, plans, designs, or technical information more clearly than
  Markdown. Use for visual explanations, interactive documents, UI mockups,
  design comparisons, architecture views, and other browser-based communication
  artifacts. Default to Markdown when straightforward linear prose is enough.
---

# HTML Communication

Turn information into a page designed to be understood, explored, compared, or
reacted to. Determine the content through the normal research, planning, or
writing workflow; use this skill to communicate it.

## Compose the Page

- Start from the message, audience, and decisions the page should support.
- Choose the visual form freely. Use layout, typography, diagrams, interaction,
  animation, or unconventional structure whenever they genuinely improve the
  communication.
- Always use an intentional dark-mode theme. Let the subject determine its
  palette, density, and visual language rather than applying a stock template.
- Prefer a self-contained `.html` file for portability, but use local assets or
  dependencies when they materially improve the result.
- Keep important content readable and controls usable. Render and inspect the
  finished page when browser tooling is available and its visual composition or
  interaction matters.
- Treat the page as a communication artifact, not production application code,
  unless the request explicitly says otherwise.

## Examples

- Prototype three UI concepts—A, B, and C—in one page so the user can compare
  them directly and choose a favorite or combine specific parts from each.
- Explain a system architecture through an annotated flow, component
  relationships, and details that reveal themselves when useful.
- Compare technical approaches with visual trade-offs, lifecycle diagrams, and
  concrete examples rather than a long sequence of prose sections.
- Turn a plan into a dependency map, milestones, risks, and sequencing that can
  be understood at a glance.
- Present an investigation or postmortem as a timeline connecting evidence,
  causes, consequences, and proposed fixes.
- Communicate research or metrics through tailored charts and explanatory
  annotations rather than a wall of tables.

## Deliver the Artifact

Use the exact path or directory the user supplies. Otherwise choose a genuinely
ignored scratch or temporary location so the artifact does not clutter the
repository. Do not stage or commit it unless explicitly asked.
