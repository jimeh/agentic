# Prompt Snippets

Agent-agnostic prompt snippets for the research-plan-implement workflow. These
work with any AI coding assistant — paste the snippet, then append your specific
context at the end.

Ideal for text expansion apps (Raycast, TextExpander, Alfred, Espanso, etc.)
where a short trigger expands into the full prompt.

## Suggested Triggers

| Trigger | Phase     |
|---------|-----------|
| `/pwr`  | Research  |
| `/pwp`  | Plan      |
| `/pwf`  | Refine    |
| `/pwt`  | Todo      |
| `/pwi`  | Implement |
| `/pwv`  | Review    |

## Workflow

```
/pwr → /pwp → /pwf (repeat) → /pwt → /pwi [→ /pwv]
```

## Research (`/pwr`)

Deep-read a codebase area and write structured findings. Append the area to
research after the snippet.

> Research the following area in depth. Understand implementations, not just
> signatures — trace data flows, follow function calls into dependencies, check
> tests and configuration for hidden constraints. Use git history when it helps
> explain why things are the way they are. Keep going until you have a thorough
> understanding, don't settle for a surface-level read. When done, write a
> detailed report of your findings in research.md. Be specific — cite file
> paths, line numbers, and include short code snippets where they clarify
> behavior. Do not propose changes or solutions, this is purely about
> understanding. The area to research:

## Plan (`/pwp`)

Create a detailed implementation plan based on the actual codebase. Append the
feature or change description after the snippet.

> If research.md exists, read it first. Read all source files relevant to the
> change — base the plan on the actual codebase, not assumptions. Never plan
> changes to code you haven't read. Write a detailed plan.md outlining how to
> implement this. Include code snippets showing the proposed changes (real code,
> not pseudocode), file paths to modify, and trade-offs. Describe each change in
> plain English too — what's changing and why — so a reviewer can follow without
> diffing. The plan should be specific enough that implementation becomes
> mechanical. Do not implement any changes — write only the plan document.
> Here's what I want to build:

## Refine (`/pwf`)

Address inline notes you've added to plan.md or research.md. Open the document
in your editor, add corrections or directions as inline notes, then paste this.

> I added notes to the document (plan.md or research.md — whichever exists;
> prefer plan.md if both do). Read it, find every note, address each one, and
> update the document accordingly. Address all notes — don't skip any, even
> minor ones. If a note requires restructuring a section, restructure it fully.
> If it references code behavior, re-read the source to verify. Remove each note
> after addressing it so the document reads cleanly. If a note is ambiguous,
> flag it with `[Interpreted as: X — correct me if wrong]`. Do not implement any
> changes — only update the document.

## Todo (`/pwt`)

Add a granular task breakdown to the plan before implementation begins.

> Add a detailed todo list to plan.md with all the phases and individual tasks
> necessary to complete the plan. Use checkboxes (`- [ ]`) so progress can be
> tracked during implementation. Tasks should be granular enough that each one
> represents a meaningful, verifiable step. Group them by phase or logical area.
> Do not implement anything — only add the task breakdown.

## Implement (`/pwi`)

Execute the plan mechanically. Every decision should already be made.

> Read plan.md and implement everything in it. Every decision has already been
> made in the plan — this is the execution phase. If the plan has no task
> breakdown, generate one first. Implement it all, don't cherry-pick. When you
> complete a task or phase, mark it as done in the plan document. Don't forget
> to regularly update the task list as you go. Do not stop
> until all tasks are completed. Run the project's type checker and linter after
> each logical group of changes. For tests, run only the subset relevant to the
> code you just changed. Fix issues immediately rather than accumulating them.
> Follow existing codebase patterns and conventions. Don't add unnecessary
> comments or refactor adjacent code unless the plan says to. If a planned
> change doesn't work as expected, resolve it within the spirit of the plan — if
> the plan has a genuine flaw that blocks progress, stop and describe the issue
> clearly.

## Review (`/pwv`)

Optional post-implementation sanity check. Run after `/pwi` to verify the
implementation.

> Read plan.md (and research.md if it exists) and the changed source files.
> Write review.md covering: (1) plan deviations and whether they matter, (2)
> code concerns — edge cases, integration issues, error handling, naming
> inconsistencies, security, performance, or test coverage gaps, (3) recommended
> next steps — areas to update, tests to add, docs to write, follow-up work.
> Don't nitpick style; focus on things that could cause bugs or maintenance
> headaches. Keep recommendations actionable and prioritized. Be specific, cite
> file paths. Do not make any code changes.
