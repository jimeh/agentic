# Lists, Scroll, And Virtualization

Use this reference when working on timelines, feeds, logs, tables, diff views,
or any large or variable-height list.

## Sections

- When to virtualize
- Variable-height estimation
- Width-scoped measurement
- Scroll stability rules
- Bottom-focused timelines
- Browser verification

## When To Virtualize

Virtualization is a tool, not a default identity.

Use it when:

- the list is large enough that mounting all rows is expensive
- row render cost is non-trivial
- offscreen content meaningfully increases layout or paint cost

Consider skipping it when:

- the list is short
- row heights are simple and stable
- the virtualization overhead is greater than the cost of full rendering

Prefer the least expensive correct strategy for the current list, including
hybrid strategies for long bottom-focused timelines.

## Variable-Height Estimation

Do not use a single fixed estimate for rows whose height varies materially.

Base estimates on visible features:

- message role
- wrapping width
- markdown density
- attachment count
- expandable sections
- metadata cards or inline previews

Estimate before measurement so the initial scroll model is reasonable, then
measure against the real DOM after render.

## Width-Scoped Measurement

If height depends on wrapping, measurement caches must be scoped to width or a
width bucket.

On width change:

- invalidate affected measurements
- remeasure visible rows first
- avoid replaying stale offscreen heights collected at an old width

Missing width scoping is a common cause of late scroll jumps.

## Scroll Stability Rules

Rendering can be fast and still feel broken if the viewport jumps.

Protect scroll stability with explicit rules:

- auto-follow only when the user is near the bottom
- stop auto-follow once the user intentionally scrolls away
- preserve anchor position when content above the fold changes
- suppress correction for rows resizing inside the viewport when possible
- batch image-driven or rich-content remeasurement in `requestAnimationFrame`

For expandable rows, preserve the user-visible anchor rather than snapping to a
new absolute offset.

## Bottom-Focused Timelines

Chat and terminal-style UIs need different defaults from generic feeds:

- keep the newest live tail mounted when possible
- virtualize older content first
- follow new content only near the bottom
- pause follow while the user is reading history
- restore follow intentionally, not automatically on every event

Treat "responsive typing" and "stable tail behavior" as linked requirements.

## Browser Verification

Cover the behavior with browser tests when possible:

- varying viewport widths
- text-only rows
- attachment-heavy rows
- expanded and collapsed states
- image or rich-preview remeasurement
- scrolling upward during live updates

Verify both correctness and feel:

- no visible jump when width changes
- no flicker at overscan boundaries
- no repeated anchor correction
- no forced scroll-to-bottom while the user is reading history
