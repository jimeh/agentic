---
name: react-high-performance
description: >-
  Build, review, and refactor React UIs for runtime performance and
  responsiveness. Use when working on React apps or components that must stay
  fast under real load, including issues involving rerender containment,
  streaming state, external stores, virtualization, large lists, scroll
  stability, input latency, main-thread contention, persistence churn, or
  performance debugging.
---

# React High Performance

Build React UIs that stay responsive by controlling how work enters the tree,
how far updates travel, and how much main-thread work competes with input,
layout, and paint.

Use this skill for both implementation and review. Start with the pressure
point, choose the narrowest state and render strategy that fits, then verify
that the resulting UI stays stable under realistic load.

## Workflow

### 1. Identify the pressure point first

Classify the primary problem before changing code:

- state churn: updates happen too often
- render fanout: too much of the tree hears each update
- list or timeline cost: rows are expensive or unstable
- main-thread CPU: parsing, highlighting, filtering, or transforms block input
- persistence or layout side effects: storage, scrolling, or measurement causes
  noise

Confirm that diagnosis with evidence before prescribing a fix. Prefer React
Profiler, browser performance traces, render counters, or concrete runtime
symptoms. If direct measurement is unavailable, state that the diagnosis is a
hypothesis and keep the proposed change proportional to that uncertainty.

Do not start with blanket memoization. First decide what work is entering the UI
and why.

### 2. Choose the state model by update frequency

Model state by how often it changes, not only by feature area:

- `hot`: streaming progress, connection status, transient presence, live
  activity
- `warm`: messages, sessions, list summaries, thread metadata
- `cold`: settings, keybindings, flags, static config
- `remote`: request-backed data with caching and invalidation

Default mapping:

- local component state for isolated transient UI
- external subscriptions or fine-grained atoms for hot shared state
- normalized external store for warm shared app data
- query cache for remote request lifecycle

If hot and cold state share a broad subscription surface, split them.

Read [state-and-dataflow](references/state-and-dataflow.md) when designing store
shape, selectors, draft flow, batching, or external subscriptions.

### 3. Apply containment patterns before micro-optimizing

Use the cheapest architectural containment that solves the problem:

- normalize changing collections into `ids`, `byId`, and per-parent lookups
- separate draft state from canonical server-backed state
- subscribe rows to summary records, not full entities
- preserve selector reference stability
- share empty array and object constants
- gate derived writes with explicit equality checks
- batch incoming events before committing store writes
- derive side effects from the whole batch, not each event

Prefer render-boundary fixes over scattered `useMemo` and `useCallback`.

Read [state-and-dataflow](references/state-and-dataflow.md) for concrete
patterns and failure modes.

### 4. Handle long lists and streaming UI deliberately

For feeds, chats, logs, tables, and diff views:

- virtualize only when the list is large enough to justify the overhead
- keep the newest live tail mounted when the UX is bottom-focused
- estimate variable row height before measurement
- scope measurement caches to width when wrapping affects height
- remeasure after width changes and content expansion
- auto-follow only near the bottom
- preserve anchor position when content above the fold changes
- batch resize and image-driven correction in `requestAnimationFrame`

Treat scroll stability as part of performance, not a separate concern.

Read
[lists-scroll-and-virtualization](references/lists-scroll-and-virtualization.md)
for list strategy, measurement, and bottom-follow rules.

### 5. Protect input and main-thread responsiveness

Keep the main thread available for typing, layout, and paint:

- enable React Compiler when the stack supports it
- use manual memoization only for identity-sensitive or expensive boundaries
- use `useDeferredValue` for search and filter input
- use `startTransition` for non-urgent UI changes
- move CPU-heavy parsing, tokenization, diffing, or indexing to workers
- bound caches for expensive output
- lazy-load heavy optional UI
- debounce and partialize persistence
- use `queueMicrotask`, `requestAnimationFrame`, and `ResizeObserver` for the
  right jobs

Do not use `setTimeout` as a generic timing primitive.

Read
[main-thread-caching-and-persistence](references/main-thread-caching-and-persistence.md)
for CPU, cache, persistence, timing, CSS, and render-boundary guidance.

### 6. Verify performance-sensitive behavior directly

Require checks that prove the behavior, not just the code shape:

- unit tests for selector stability and equality gates
- unit tests for event coalescing, capped buffers, and persistence transforms
- browser tests for virtualization estimates, width-sensitive wrapping, scroll
  stability, and expansion behavior
- explicit notes about missing checks when a change cannot be fully verified

When reviewing code, treat unstable references, unbounded buffers, and noisy
storage writes as real performance bugs.

## Review Heuristics

When asked to review or refactor:

- name the dominant pressure point before proposing fixes
- prefer fewer subscribers over cheaper renders
- prefer store-shape changes over component-level band-aids
- protect typing and scrolling before optimizing cold paths
- call out where React Compiler should be enough and where it is not
- note missing caps, missing debounce, or missing width-scoped measurements
- ask for browser verification when the risk is scroll or measurement related

## Quick Audit

Before calling a screen high performance, check:

- hot state is not sharing a wide subscription surface with cold state
- large collections are normalized and draft state is isolated
- selectors preserve stable references and shared empty values
- derived writes use equality gates
- incoming events are batched before store writes
- long-lived buffers and caches have hard limits
- long lists use the least expensive correct strategy
- variable-height virtualization is calibrated and width-aware
- scroll behavior stays stable during resize, expansion, and streaming
- input stays responsive during filtering, loading, and live updates
- CPU-heavy work is deferred, offloaded, or bounded
- persistence excludes volatile runtime state and does not write on every tick
- tests cover the performance-sensitive behavior or the gap is called out
