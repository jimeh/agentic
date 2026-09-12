---
name: html-communication
description: >-
  Create standalone dark-mode HTML explanations or presentations when visual
  layout helps. Product experiments use prototype; linear prose stays
  Markdown.
---

# HTML Communication

Turn information into a page designed to be understood, explored, compared, or
reacted to. Determine the content through the normal research, planning, or
writing workflow; use this skill to communicate it.

Use `prototype` when the artifact's purpose is to test product logic, state, or
UI inside its real context. Apply this skill as well only when the user
separately requests a presentation page for the prototype or its findings.

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

## Deliver the Artifact

Use the exact path or directory the user supplies. Otherwise choose a genuinely
ignored scratch or temporary location so the artifact does not clutter the
repository. Do not stage or commit it unless explicitly asked.
