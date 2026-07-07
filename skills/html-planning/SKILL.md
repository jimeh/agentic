---
name: html-planning
description: >-
  Write plans, specs, design docs, and proposals as self-contained HTML files
  with a consistent structure: dark theme, sticky sidebar TOC with scrollspy,
  phase status badges, and required plan sections. Use when the user explicitly
  asks for a plan or planning document as an HTML file, or asks to update an
  existing HTML plan. Do not proactively switch other documents or plans to
  HTML.
---

# HTML Planning

## Overview

Produce planning documents as single, self-contained `.html` files. HTML gives
longer plans better layout, navigation, and readability than Markdown, but only
when every plan shares the same structural backbone. This skill fixes that
backbone (theme, navigation, sections, badges) while leaving visual personality
to fit the task.

## When to Use

- The user explicitly asks for a plan, spec, design doc, or proposal as an HTML
  file.
- The user asks to update, extend, or mark progress on an existing HTML plan.

Do not use HTML for plans or documents when the user has not asked for it, and
do not suggest converting Markdown plans to HTML unprompted.

## File Location and Naming

- Use the exact path or directory the user gives.
- Otherwise, write to a location git actually ignores (a scratchpad or temp
  directory, or a repo path matched by `.gitignore`) and say where the file was
  written. Merely untracked paths clutter `git status`; if no ignored
  destination is obvious, ask.
- Never stage or commit plan files unless the user explicitly asks.
- Default name: `<topic>-plan.html`, e.g. `auth-refactor-plan.html`.

## Start from the Template

Read [references/template.html](references/template.html) and use it as the
structural skeleton. It provides the layout grid, sidebar TOC with scrollspy,
status badges, metadata header, collapsible sections, code block styling, and
print stylesheet.

Adapt it, do not reproduce it verbatim:

- Keep the structure: layout, navigation, section order, badge semantics,
  metadata header, print behavior.
- Restyle the surface: colors, accent, typography scale, spacing, and decorative
  touches are yours to choose per document. All theming runs through the CSS
  variables in `:root`, so retheme there. Distinct plans looking distinct helps
  humans tell them apart; do not ship the template's example palette unchanged
  every time.
- Visual clarity and clean structure always win over decoration. Prioritize
  readable line lengths (~70–80ch), a clear heading hierarchy, and strong text
  contrast.

## Hard Requirements

Every HTML plan must be:

- **Dark themed.** Dark mode only, no light theme, no theme toggle. The only
  light rendering is the print stylesheet.
- **Fully self-contained.** One file, zero network requests: system font stack,
  inline CSS and JS, inline SVG for diagrams. No CDN scripts, no web fonts, no
  external images. It must render correctly offline, forever.
- **Navigable.** Sticky sidebar TOC with links to every section and JS scrollspy
  highlighting the current section. The sidebar collapses to a top-of-content
  block on narrow screens.
- **Responsive.** Single column under ~800px; no horizontal page scroll. Wide
  content (tables, code) scrolls inside its own container.
- **Light on JS.** Scrollspy, opening `<details>` before print, and similar
  small enhancements only. The document must read fine with JS disabled. No
  `localStorage`/`sessionStorage`/`IndexedDB`, no fetch/XHR.
- **Printable.** `@media print` rules: light background, sidebar hidden,
  collapsibles expanded, sane page breaks.

## Required Sections

In order, adjusting names to fit the task:

1. **Header** — plan title, one-sentence framing, and a metadata block: date,
   repo and branch, author (agent and model), and overall plan status badge.
2. **Context** — the problem, current state, and why the work matters.
3. **Goals & Non-goals** — explicit scope boundaries; what is deliberately out
   of scope.
4. **Implementation phases** — concrete steps grouped into phases. Every phase
   carries a status badge — CSS classes `pending`, `in-progress`, `done`, or
   `blocked` on `.badge` — labelled "Pending", "In progress", "Done", or
   "Blocked". Include affected files and commands where known.
5. **Testing strategy** — how each phase and the overall change get verified.
6. **Open questions** — unresolved decisions surfaced visibly in their own
   section, never buried in prose. If none, say so.
7. **Progress log** — dated entries recording status changes, deviations from
   the plan, and decisions made during implementation. Starts with a single
   "plan created" entry.

Add extra sections (alternatives considered, risks, rollout, diagrams) when the
task warrants them.

## Content Style

- Comprehensive but scannable: full prose where reasoning matters, relying on
  the TOC, tables, and collapsibles to stay navigable.
- Push long secondary material (exhaustive file lists, rejected alternatives,
  raw evidence, appendices) into `<details>`/`<summary>` blocks. Content the
  plan cannot be understood without belongs in the open, not inside closed
  collapsibles.
- Code blocks are plain `<pre><code>` with good font, background, and border
  styling. No syntax highlighting: no CDN highlighters, no hand-rolled token
  spans.
- Use inline `<svg>` for architecture and flow diagrams when a diagram genuinely
  aids understanding; never decorative diagrams, never raster screenshots of
  code or text.
- Tables for enumerable facts (file lists, phase summaries, option comparisons),
  prose for reasoning.

## Living Document

When implementing a plan that exists as an HTML file:

- Update phase status badges as work starts, completes, or blocks.
- Update the overall status badge in the header when the plan's state changes.
- Append dated entries to the progress log for status changes, deviations from
  the plan, and decisions made along the way. Do not rewrite history; the log is
  append-only.
- Keep edits surgical: update status and log, do not restyle or restructure an
  existing plan unless asked.

## Boundaries

This skill governs the format and structure of HTML plan files. It does not
change how plans are researched or decided: gather context, weigh approaches,
and confirm scope exactly as you would for any other plan, then render the
result with this skill.
