---
allowed-tools: Read, Write, Glob, Grep, LS, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
description: Sanity-check the implementation against the plan and recommend next steps
argument-hint: "[optional focus area or concerns]"
---

## Context

- Plan file: !`find . -maxdepth 1 -name 'plan.md' 2>/dev/null`
- Research file: !`find . -maxdepth 1 -name 'research.md' 2>/dev/null`
- Git status: !`git status --short`

## Your Task

Review the implementation that was just completed. Read `plan.md` (and
`research.md` if it exists), then read the actual source files that were
changed. Compare what was built against what was planned.

Write findings to `review.md`, covering three areas:

### 1. Plan Adherence

Did the implementation follow the plan? Call out any deviations — skipped tasks,
changed approaches, or additions that weren't in the plan. Minor deviations that
make sense in context are fine to note briefly; focus attention on anything that
might have unintended consequences.

### 2. Code Quality and Concerns

Now that the changes are in place, does the final state of the code make sense?
Look for:

- Logic that doesn't integrate well with surrounding code
- Edge cases the plan didn't anticipate
- Error handling gaps
- Naming or structural inconsistencies introduced by the changes
- Test coverage gaps for the new code
- Security concerns relevant to the changes (not generic checklists)
- Performance bottlenecks introduced or exposed by the changes

Be specific — cite file paths and line numbers. Don't nitpick style; focus on
things that could cause bugs or maintenance headaches.

### 3. Recommended Next Steps

Based on everything you know from the research, plan, and implementation,
suggest concrete follow-up work. This might include:

- Related areas that should be updated for consistency
- Tests that should be added
- Documentation that needs updating
- Performance considerations to revisit under load
- Adjacent features or refactors that would pair well with this change

Keep recommendations actionable and prioritized. Don't pad with generic advice.

Do NOT make any code changes. This is a read-only review phase.
