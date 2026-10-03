---
type: agentic-rules
filename: CLAUDE.md
---

<!-- include: base.md -->

## Execution Mode

- When multi-agent execution is in play, load the `multi-agent-execution` skill
  for decomposition, model routing, and independent review.
- Never select Fable 5.1 for a subagent or delegated worker on your own
  judgment. Use it only when the user names Fable for that work, and do not
  extend the request to other delegations in the session.

<!-- include: codegraph.md -->
