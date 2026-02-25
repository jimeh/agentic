---
allowed-tools: Read, Write, Edit, Glob, Grep, LS, Bash, Task, NotebookEdit
description: Execute the implementation plan, marking progress in plan.md
argument-hint: "[optional additional constraints]"
---

## Context

- Plan file: !`find . -maxdepth 1 -name 'plan.md' 2>/dev/null`
- Git status: !`git status --short`

## Your Task

Read `plan.md` (or a filename specified by the user) and implement
everything in it. Every decision has already been made in the plan — this
is the execution phase.

If the plan doesn't have a task breakdown (todo list with checkboxes),
generate one first before starting implementation.

Implement everything — don't cherry-pick. Mark each task or phase as done
in the plan document as you complete it. Don't forget to regularly update
the task list in plan.md as you go — don't let it fall behind. Don't stop
until all tasks are
completed. Don't pause for confirmation mid-flow unless you hit a genuine
ambiguity the plan doesn't address.

Run the project's type checker and linter after each logical group of
changes. For tests, run only the subset relevant to the code you just
changed — don't run the full test suite after every task unless it's very
small. Fix issues immediately rather than accumulating them. Follow
existing codebase patterns and conventions. Don't add unnecessary comments
or refactor adjacent code unless the plan says to.

If a planned change doesn't work as expected, resolve it within the spirit
of the plan. If the plan has a genuine flaw that blocks progress, stop and
describe the issue clearly — don't silently deviate.
