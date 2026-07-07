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

Produce planning documents as single, self-contained `.html` files. The point of
HTML is layout Markdown cannot express: a plan that reads like a rendered
Markdown file has missed it. This skill fixes the structural backbone (theme,
navigation, sections, badges) so plans are consistent, while leaving layout and
visual personality free to serve each plan's content.

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

- Keep the structure: page layout, navigation, section order, badge semantics,
  metadata header, print behavior. Inside sections, the template's plain
  placeholder markup is deliberately minimal and is not layout guidance —
  section interiors are yours to design.
- Restyle the surface: colors, accent, typography scale, spacing, and decorative
  touches are yours to choose per document. All theming runs through the CSS
  variables in `:root`, so retheme there. Distinct plans looking distinct helps
  humans tell them apart; do not ship the template's example palette unchanged
  every time.
- Visual clarity and clean structure always win over decoration. Keep the
  content column centered in the viewport beside the sidebar with a capped width
  (the template's `--content-width`), and prioritize a clear heading hierarchy
  and strong text contrast.

## Hard Requirements

Every HTML plan must be:

- **Dark themed.** Dark mode only, no light theme, no theme toggle. The only
  light rendering is the print stylesheet.
- **Self-contained.** One file: system font stack, inline CSS and JS, inline SVG
  for diagrams. No web fonts, no external images, and no CDN scripts other than
  the two exceptions below. The document must stay fully readable offline;
  anything loaded from a CDN is a progressive enhancement, never a carrier of
  content.
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

## CDN Exceptions

Two libraries may be loaded from a CDN when the plan genuinely benefits. Both
are enhancements: the plan must remain complete and readable if they never load.
Use the copy-paste snippets in the comment at the end of the template verbatim:
their pinned versions and integrity hashes are maintained in this skill, so do
not check for newer versions, recompute hashes, or otherwise vary the tags.

- **highlight.js** — allowed when the plan is code-heavy enough that syntax
  colors genuinely aid reading. Load the JS and a dark theme CSS from cdnjs with
  `integrity` hashes, and mark code blocks with `class="language-x"`. Failure
  mode is today's plain code blocks, so this is always safe.
- **Mermaid** — allowed for diagrams that are genuinely painful as hand-written
  SVG: sequence diagrams, larger flowcharts, state machines. Load the ESM build
  from jsDelivr and initialize with `theme: 'dark'`. The offline fallback is the
  raw Mermaid source shown in its `<pre class="mermaid">` block, so keep that
  source clean and readable. Simple diagrams (a few boxes and arrows) stay
  inline SVG.

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

- Use layout as a tool. For each section, pick the presentation that
  communicates its content best instead of defaulting to a linear column of
  headings, paragraphs, and lists — if the whole document could have been
  rendered from Markdown, the format added nothing. Let the shape of the content
  decide, and keep clarity the test: structure must aid scanning and
  comprehension, never decorate.
- Comprehensive but scannable: full prose where reasoning matters, relying on
  the TOC, tables, and collapsibles to stay navigable.
- Push long secondary material (exhaustive file lists, rejected alternatives,
  raw evidence, appendices) into `<details>`/`<summary>` blocks. Content the
  plan cannot be understood without belongs in the open, not inside closed
  collapsibles.
- Code blocks are plain `<pre><code>` with good font, background, and border
  styling by default. No hand-rolled token spans; for code-heavy plans, use the
  highlight.js exception above instead.
- Use inline `<svg>` for architecture and flow diagrams when a diagram genuinely
  aids understanding; never decorative diagrams, never raster screenshots of
  code or text. Diagrams too intricate for hand-written SVG may use the Mermaid
  exception above.
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
