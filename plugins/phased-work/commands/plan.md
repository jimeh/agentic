---
allowed-tools: Read, Glob, Grep, LS, Write, Bash(git log:*), Bash(git show:*), Bash(find:*)
description: Create a detailed implementation plan in plan.md
argument-hint: <feature or change to plan, e.g. "cursor-based pagination for the list endpoint">
---

## Context

- Research file: !`find . -maxdepth 1 -name 'research.md' 2>/dev/null`

## Your Task

Create a detailed implementation plan in `plan.md` for the feature or change
described by the user's arguments.

If a research file exists (see context above), read it thoroughly first.
Read all source files relevant to the change — base the plan on the actual
codebase, not assumptions. If the user provided a reference implementation,
study it closely.

The plan should include code snippets showing proposed changes (real code,
not pseudocode), file paths to modify, and trade-offs. It should be
specific enough that implementation becomes mechanical. Structure the
document however best fits the task at hand.

Read source files before proposing changes. Never plan changes to code you
haven't read.

Do NOT implement any changes. Write only the plan document.
