---
name: html-planning
description: >-
  Create or update self-contained HTML plans and technical documents. Use when
  the user explicitly requests HTML, when updating an existing HTML document,
  or when a concrete visual or spatial layout would communicate the content
  materially better than Markdown. Default to Markdown for documents that fit
  headings, prose, lists, tables, code blocks, and straightforward diagrams,
  regardless of length. Do not use HTML merely to make a document polished or
  browser-ready; Markdown can be rendered or uploaded separately.
---

# HTML Planning

## Choose the Format

Before choosing HTML without an explicit request, identify the specific layout
Markdown cannot express clearly. Choose HTML autonomously when that need is
concrete; otherwise use Markdown. Do not ask the user to choose between formats
when the content makes the answer clear.

HTML may be worthwhile for coordinated multi-panel comparisons, spatial
architecture views, dense timelines, or other layouts where placement and visual
grouping carry meaning. Document length alone is not a reason to use HTML.

## Workflow

1. Research and decide the document's content through the normal planning or
   writing workflow. This skill governs presentation, not reasoning or scope.
2. Design the document around the concrete visual need that justified HTML. Let
   the content determine the sections and layout.
3. Write a single `.html` file with semantic markup, inline CSS, and only the
   JavaScript that materially improves comprehension.
4. When updating an existing HTML document, preserve its visual language and
   structure. Make surgical content and status changes unless asked to redesign
   it.

## File Handling

- Use the exact path or directory the user gives.
- Otherwise, use a location Git actually ignores, such as a scratchpad or temp
  directory. An untracked path still clutters `git status`; ask if no suitable
  ignored destination is clear.
- Never stage or commit the document unless the user explicitly asks.
- Default to `<topic>-<kind>.html`, such as `auth-refactor-plan.html` or
  `billing-api-spec.html`.

## Expected UX

- Use a dark, low-glare color scheme by default with accessible contrast.
  Preserve an existing document's palette and follow an explicitly requested
  theme. A light print palette is acceptable when print styling is relevant.
- Use semantic HTML, a clear heading hierarchy, landmarks, descriptive links,
  visible keyboard focus, and reduced-motion behavior when animation exists.
- Make layout serve comprehension. Avoid decorative panels, diagrams, or
  interactions that do not clarify the document.
- Keep the page responsive without horizontal page scrolling. Contain wide
  tables, code, and diagrams in their own scrollable regions.
- Keep the document readable without JavaScript. Prefer CSS and native HTML; add
  scripts only for interactions or visualizations that provide real value.
- Keep essential content in the file with inline CSS and inline SVG where
  practical. Avoid external dependencies. If an optional CDN enhancement is
  genuinely useful, pin its version and preserve a complete readable fallback.
- Add navigation only when the document is long enough to benefit. A native
  linked table of contents is usually enough; scrollspy is optional.
- Add print styling, status badges, collapsible material, metadata, or a
  progress log only when the document itself needs them. They are not format
  requirements.
- Use tables for enumerable facts, prose for reasoning, and diagrams only when
  relationships are harder to understand linearly.

## Verification

Inspect the finished file for complete content, valid internal links, readable
fallbacks, and accidental external dependencies.

Do not open a browser merely because an HTML document was created. Browser-test
only custom layout, SVG, or interaction with a meaningful risk of visual or
behavioral breakage, or when the user requests visual verification. Test only
the viewports relevant to that risk; desktop and mobile checks are not a
universal requirement.

## Boundaries

Do not impose a section order, metadata block, badge system, progress log, or
other planning structure merely because the output is HTML. Follow the content
requirements of the active planning or writing workflow, then choose the
clearest HTML presentation for that content.
