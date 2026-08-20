---
name: prototype
description: >-
  Build a throwaway interactive prototype to answer one explicit question about
  a logic or state model, or to compare structurally different UI directions.
  Use when the user asks to create, explore, or compare a prototype. Do not
  invoke for a read-only design question that can be answered without an
  artifact.
---

# Prototype

Build the smallest disposable artifact that can answer one design question.
State the question visibly in the prototype and let it determine the branch:

- **Logic or state**: read [references/logic.md](references/logic.md) and create
  one self-contained interactive HTML file.
- **UI direction**: read [references/ui.md](references/ui.md) and create three
  structurally distinct variants by default, up to five, that can be switched at
  one stable URL.

An explicit prototype request authorizes temporary prototype artifacts and safe
local execution. Keep them outside the repository by default. A repository-local
request authorizes writing the prototype only at its requested or agreed
location. Modify an existing application page only when the user explicitly asks
for an in-app prototype. Do not create a branch, commit, push, upload, durably
preserve the prototype, or touch production and live systems unless separately
authorized.

This skill owns throwaway product behavior and UI experiments. Do not also apply
`html-communication` unless the user separately requests a presentation artifact
for the prototype or its result; that skill's standalone dark-mode page contract
does not govern an in-product prototype.

Use the repository's real domain language, data shapes, component system, and
nearby surface when they materially affect the answer. Do not connect a visual
prototype to real mutations. Persistence experiments use clearly isolated local
scratch state only when persistence is the question.

## Verify and Hand Over

Make the prototype trivial to start and inspect. Use the environment's browser
workflow to exercise every logic walkthrough or UI variant, check the relevant
state after actions, and capture concise visual or runtime evidence. Surface the
local path or URL and the question it answers. Provide a shareable upload only
when the user asks for a link.

Record the verdict in the response or in an explicitly authorized project
artifact. Clean up temporary services and scratch state. Leave the prototype
file at the reported temporary path until the user asks for removal or the
host's documented temporary-file cleanup removes it; do not promise a retention
period the environment does not provide.

If a decision graduates into product code, do not promote the prototype
mechanically. Re-implement the winning behavior using repository conventions,
error handling, accessibility, and proportionate tests, then remove prototype
switchers and losing variants from production paths. Those mutations require an
explicit implementation request.

## Source

Adapted from Matt Pocock's pinned
[`prototype`](https://github.com/mattpocock/skills/blob/885e2ca4d842d139e9aef4e48d366c63cb1b8013/skills/engineering/prototype/SKILL.md)
skill.
