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
5. Record remaining debt in its maintained source of truth, if follow-up is
   needed.

Avoid broad rewrites unless the user explicitly asks for them.

## Choose the maintained record

Use the [artifact lifetime decision](repo-knowledge-map.md#artifact-lifetime)
before adding a quality document or plan. An existing issue tracker, generated
report, or check's explicit exception list may already own the information.
Create a Markdown tracker only when someone or a workflow will maintain it. For
accepted debt, record the reason and reconsideration condition where the
exception is owned. Avoid parallel lists that disagree after the next cleanup.

## Recurring Prompts

Good cleanup prompts are narrow:

- "Find stale docs that mention removed package scripts."
- "Find duplicated concurrency helpers and propose one consolidation."
- "Find violations of the domain naming glossary."
- "Reconcile resolved exceptions with the maintained debt record."

Bad cleanup prompts are vague:

- "Clean up the repo."
- "Improve quality."
- "Remove AI slop."
