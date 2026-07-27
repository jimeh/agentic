---
type: agentic-rules
filename: CLAUDE.md
---

<!-- include: base.md -->

## Execution Mode

- Do the work directly in the current Claude session by default.
- Do not delegate, spawn subagents, launch workflows, or request independent
  reviews unless the user explicitly asks for multi-agent execution, subagents,
  or a workflow, or invokes a named skill whose documented workflow requires
  them.
- You may suggest multi-agent execution when it would materially help, but wait
  for approval before starting it.
- Once the user opts in, load the `multi-agent-execution` skill for
  decomposition, model routing, and independent review.

@RTK.md
