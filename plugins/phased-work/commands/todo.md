---
allowed-tools: Read, Write, Edit
description: Add a granular task breakdown to the plan document
argument-hint: "[optional: filename if not plan.md]"
---

## Important

Do NOT use EnterPlanMode or ExitPlanMode. This command manages planning through
plan.md — Claude Code's built-in plan mode is separate and must not be used.
When you finish adding the task breakdown, stop. Do not implement anything or
transition to the next phase.

## Context

- Plan file: !`find . -maxdepth 1 -name 'plan.md' 2>/dev/null`

## Your Task

Read `plan.md` (or a filename specified by the user) and add a detailed todo
list with all phases and individual tasks necessary to complete the plan. Use
checkboxes (`- [ ]`) so progress can be tracked during implementation.

Tasks should be granular enough that completing each one represents a
meaningful, verifiable step. Group them by phase or logical area.

Do NOT implement anything. Only add the task breakdown to the plan. When the
todo list is written, your job is done — stop and let the user review it.
