# Entropy Cleanup

Use this when a repo is accumulating inconsistent agent-generated patterns.

## What to Look For

- duplicated helpers that encode different behavior
- stale docs that contradict code
- copied test fixtures with subtle drift
- inconsistent naming for the same domain concept
- one-off scripts that should be shared
- growing files that hide multiple responsibilities
- repeated review comments
- lint suppressions without durable reasons
- generated files edited by hand

## Cleanup Strategy

Prefer small, reviewable cleanups:

1. Pick one drift class.
2. Gather evidence with `rg`, tests, or a script.
3. Fix the highest-leverage cluster.
4. Add a check or doc pointer if recurrence is likely.
5. Record remaining debt in the project quality or tech debt tracker.

Avoid broad rewrites unless the user explicitly asks for them.

## Quality Tracker Shape

If a project lacks a tracker and cleanup will recur, add a small Markdown file:

```markdown
# Quality Tracker

## Current Priorities

| Area | Grade | Evidence | Next action |
| --- | --- | --- | --- |
| Docs freshness | B | ... | ... |

## Accepted Debt

- <debt>: accepted until <condition/date/release>, owner <team/person if known>
```

Use whatever name/location matches the project. Do not invent heavy process for
small repositories.

## Recurring Prompts

Good cleanup prompts are narrow:

- "Find stale docs that mention removed package scripts."
- "Find duplicated concurrency helpers and propose one consolidation."
- "Find violations of the domain naming glossary."
- "Update the quality tracker after inspecting recent TODOs."

Bad cleanup prompts are vague:

- "Clean up the repo."
- "Improve quality."
- "Remove AI slop."
