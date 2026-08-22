---
name: eli5
description: >-
  Explain a topic, module, tradeoff, decision, or incident to someone who knows
  nothing about it, as a standalone visual HTML page with big pictures and few
  words. Use when the user asks for an ELI5 or plain-language explainer, such
  as "how does this module work" or "why did we make this tradeoff". Do not use
  for expert-audience documentation or technical answers that fit in chat.
---

# ELI5

Explain the subject as if the reader has zero background knowledge, using a
visual HTML page that leans on big pictures and few words.

## Ground It First

Research the actual subject before explaining it. Read the code, decisions, or
events involved so the explanation reflects how the thing really works, not a
plausible-sounding generality. An ELI5 that gets the mechanics wrong is worse
than none.

## Write for No Prior Knowledge

- Define every term at first use, or replace it with plain language. Jargon may
  appear only after its everyday-language equivalent has established the idea.
- Build from something the reader already knows. Everyday analogies carry more
  weight than precision here; state clearly where an analogy breaks down if the
  gap would mislead.
- Make one point per section. Sequence sections so each builds only on what came
  before.
- Prefer a few concrete examples over exhaustive coverage. Depth comes from one
  worked example, not from enumerating cases.

## Let Pictures Do the Talking

- Lead each major idea with a large, simple visual — diagram, flow, annotated
  illustration — that carries it on its own.
- Keep text subordinate to visuals: short labels and captions, not paragraphs
  beside a picture.
- If a section needs no visual, question whether it belongs in the page.

## Deliver

Build the artifact with the `html-communication` skill's conventions:
intentional dark mode, a self-contained `.html` file in a scratch location
unless the user supplies a path, and no staging or committing unless asked.
