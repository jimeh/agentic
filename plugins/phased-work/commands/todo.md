---
allowed-tools: Read, Write, Edit
description: Add a granular task breakdown to the plan document
argument-hint: "[optional: filename if not plan.md]"
---

## Context

- Plan file: !`find . -maxdepth 1 -name 'plan.md' 2>/dev/null`

## Your Task

Read `plan.md` (or a filename specified by the user) and add a detailed
todo list with all phases and individual tasks necessary to complete the
plan. Use checkboxes (`- [ ]`) so progress can be tracked during
implementation.

Tasks should be granular enough that completing each one represents a
meaningful, verifiable step. Group them by phase or logical area.

Do NOT implement anything. Only add the task breakdown to the plan.
