---
allowed-tools: Read, Glob, Grep, LS, Write, Task, Bash(git log:*), Bash(git show:*), Bash(git blame:*)
description: Deep-read a codebase area and write structured findings to research.md
argument-hint: <area to research, e.g. "the auth system" or "src/notifications/">
---

## Your Task

Research the area described by the user's arguments. Produce a thorough
`research.md` document capturing everything relevant about how the system
works.

Read deeply — understand implementations, not just signatures. Trace data
flows end-to-end, follow function calls into dependencies, check tests and
configuration for hidden constraints. Use git history when it helps explain
why things are the way they are. If the area is large, use the Task tool
with subagent_type=Explore to parallelize, then synthesize findings yourself.

Keep going until you have a thorough understanding. Don't settle for a
surface-level read.

Write findings to `research.md`. Be specific — cite file paths, line numbers,
and include short code snippets where they clarify behavior. The document is a
review surface for the user to verify your understanding before planning begins.

Do NOT propose changes or solutions. This phase is purely about
understanding.
