# State And Dataflow

Use this reference when the bottleneck is update frequency, subscription shape,
selector stability, or event-driven store churn.

## Sections

- Update-frequency model
- Collection shape and normalized data
- Draft versus canonical state
- Selector stability
- Equality-gated derived writes
- Shared empty references
- Batching and batch-derived side effects
- Recovery-aware realtime flow
- Suggested tests

## Update-Frequency Model

Pick store boundaries by change rate first:

- `hot`: values that can change many times per second
- `warm`: shared app data that changes often, but not continuously
- `cold`: configuration and preferences
- `remote`: request-backed data that benefits from cache lifecycle handling

Useful defaults:

- `hot`: atom-style state or narrow external subscriptions
- `warm`: normalized shared store with focused selectors
- `cold`: local or low-fanout shared state
- `remote`: React Query or equivalent query cache

Avoid mixing hot and cold state in one broad subscription surface. Even cheap
renders become noisy when too much of the tree hears every update.

## Collection Shape And Normalized Data

Do not rebuild large nested collections on every change. Prefer structures that
support small writes and narrow reads:

- `threadIds`
- `threadById`
- `messageIdsByThreadId`
- `messageById`
- compact summary records for list rows

Reconstruct rich objects only in selectors that need them. Rows and summaries
should subscribe to the smallest record that matches their UI.

Normalization pays off when you need:

- smaller writes
- partial updates
- stable lookup paths
- capacity limits and eviction
- predictable selector caching

## Draft Versus Canonical State

Keep in-progress local edits off the hot path for canonical data.

Separate domains for:

- unsent composer state
- pending form edits
- optimistic placeholders
- server-canonical entities

Benefits:

- typing in a draft does not rerender canonical history
- server reconciliation does not disturb the local input model
- promotion from optimistic to canonical happens once instead of on every tick

## Selector Stability

Selectors should return the same references when inputs did not change.

Useful patterns:

- selector factories scoped by route or entity id
- `WeakMap` caches keyed by stable source objects
- shallow equality for array or object outputs
- summary selectors for rows, full selectors for detail views

If a row needs `title`, `unread`, and `updatedAt`, do not subscribe it to the
entire entity.

Treat unstable selector output as a correctness bug, not just an optimization
opportunity.

## Equality-Gated Derived Writes

Do not write derived state back unless the output actually changed.

Gate writes for:

- summary records
- persisted UI projections
- list metadata
- badges and status models
- derived shell objects

Field-level checks are often cheaper and more reliable than letting unchanged
derived objects churn through the store.

## Shared Empty References

Never allocate a new empty array or object just because no data exists yet.

Prefer shared constants:

- `EMPTY_MESSAGES`
- `EMPTY_MAP`
- `EMPTY_ACTIVITIES`

Stable empty references prevent pointless rerenders through shallow comparison
boundaries.

## Batching And Batch-Derived Side Effects

Do not write every socket or stream event directly into shared state.

Instead:

- collect events in a microtask, animation frame, or short throttle window
- coalesce adjacent changes for the same entity only when the updates are
  idempotent or the newest value fully overwrites the older one
- apply one store write per batch
- run follow-up effects after the batch commits

Preserve event order when semantics depend on sequence. Do not coalesce
streaming chunks, incremental state transitions, or other updates where
intermediate steps carry meaning.

Then derive side effects from the final batch result:

- invalidate queries once
- clear deleted entities once
- promote draft state once
- trigger recovery once if the batch reveals a gap

Per-event side effects create duplicated work and refetch storms.

## Recovery-Aware Realtime Flow

Realtime correctness and performance are linked. Use a flow that avoids
duplicate churn:

- bootstrap from a snapshot
- track sequence numbers
- ignore duplicates
- defer live events until bootstrap completes
- replay missing ranges after gaps
- fall back to a fresh snapshot when replay fails

Broken recovery logic creates flicker, duplicate renders, and inconsistent
scroll behavior.

## Suggested Tests

Write targeted tests for:

- selector referential stability for unchanged inputs
- equality gates that prevent redundant derived writes
- batch coalescing behavior across multiple incoming events
- capped buffer eviction
- draft promotion and reconciliation
- replay and gap recovery logic

If you cannot automate part of the behavior, call out the risk explicitly in the
review or change notes.
