# Main-Thread, Caching, And Persistence

Use this reference when the UI feels sluggish because compute, caching, lazy
loading, persistence, or timing primitives are working against responsiveness.

## Sections

- Input responsiveness
- React Compiler and manual memoization
- Worker offload
- Bounded caches
- Lazy loading
- Persistence strategy
- Timing primitives
- CSS and render boundaries
- Suggested tests

## Input Responsiveness

Typing, navigation, and direct manipulation should not wait behind heavy
rendering work.

Prefer:

- `useDeferredValue` for search and filter input
- `startTransition` for non-urgent view changes; keep controlled input state
  updates urgent and transition the derived filtering or result updates instead
- debounced remote lookups for autocomplete or path search
- refs for transient values that should not cause rerenders

Avoid:

- filtering large lists synchronously on every keystroke
- firing remote lookups on every character without debounce
- letting streaming UI updates compete directly with text input

## React Compiler And Manual Memoization

If the stack supports React Compiler, enable it and let it handle the common
case.

Still use manual memoization when:

- a subtree is expensive and receives stable props
- selector factories must keep referential identity
- callbacks go to identity-sensitive children or effects
- large derived arrays or maps would otherwise rebuild needlessly

Do not cargo-cult `useMemo`, `useCallback`, or `memo` around cheap values.

## Worker Offload

Move CPU-heavy work out of the main render path:

- diff parsing
- syntax highlighting
- tokenization
- AST transforms
- large search or indexing jobs

Useful defaults:

- web workers for isolated heavy jobs
- worker pools sized from available cores
- async loading with Suspense for optional heavy features

The main thread should stay available for input, layout, and paint.

## Bounded Caches

Caching helps only when it stays bounded and stable.

Good candidates:

- highlighted output
- parsed diffs
- normalized search results
- expensive render trees

Always bound by:

- entry count
- approximate memory size

Avoid caching unstable streaming output until it settles. Rotate or clear caches
when the content domain changes substantially.

## Lazy Loading

Defer heavyweight optional UI:

- diff panels
- large editors
- rich previews
- analysis tools
- rarely opened dialogs

Reserve separate loading boundaries for genuinely heavy optional features, not
every small module.

## Persistence Strategy

Persistence should preserve user intent without replaying runtime noise.

Prefer:

- debounced writes
- flush on unload only when necessary
- sanitized payloads
- partial persistence

Persist only what users expect to survive reload:

- layout preferences
- drafts
- expanded or collapsed UI state
- selected modes

Do not persist:

- event buffers
- in-flight request state
- derived caches
- runtime counters

## Timing Primitives

Use the browser primitive that matches the work:

- `queueMicrotask` for batching synchronous bursts before commit
- `requestAnimationFrame` for visual work like scroll correction and focus
- `ResizeObserver` for container-aware measurement
- passive listeners for scroll and touch paths

Avoid `setTimeout` as a substitute for these tools.

## CSS And Render Boundaries

CSS can help or hurt perceived performance.

Use:

- transition suppression during theme switches
- `overscroll-behavior` where scroll chain control matters
- CSS custom properties for theming
- `will-change` only for elements that are actually animated

Also structure components around render boundaries:

- route shell
- header metadata
- large timeline or list
- composer or input
- auxiliary panels

Memoize expensive leaf subtrees only when props are stable and the subtree cost
is real.

## Suggested Tests

Write or request checks for:

- deferred input behavior under load
- bounded cache eviction
- persistence debounce and payload shape
- lazy-loaded panel behavior
- absence of jank during theme switch or resize

If a change depends on runtime feel more than static structure, say so and ask
for browser verification.
