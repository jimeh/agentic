---
name: claude-first
description: >-
  Explicit session mode using Claude for implementation and bulk analysis
  while Codex owns decisions and delivery. Never infer from ordinary work.
---

# Claude First

This is an explicit routing posture. Once the user invokes it, use Claude as the
default executor for suitable hands-on work for the rest of the session. "Do
this one yourself" overrides it for one task; the user can end the mode at any
time.

Opus 5.5 at high effort is the default delegated model, and Fable 5.1 at high
effort is the alternative only when the user names Fable for the task. Honor
explicit model and effort overrides.

## Route to Claude

- Bounded implementation from settled requirements
- Known bug fixes, focused refactors, tests, migrations, and tooling changes
- Large read-only extraction, comparison, search, and triage
- Independent review of Codex-authored changes when the scope warrants it

Use the matching skill:

- `claude-implementation` for code changes
- `claude-analysis` for read-only evidence gathering
- `claude-review` for independent review

There is deliberately no `claude-computer-use` skill. Keep browser, GUI,
desktop, and runtime observation in Codex, whose computer-use tooling is
stronger.

## Keep in Codex

- Architecture, API, product, naming, and UX decisions
- Ambiguous work where specifying the task is the hard part
- Tiny obvious edits where delegation costs more than doing the work
- Browser, GUI, desktop, and computer-use tasks
- Destructive operations, releases, pushes, and external mutations
- Inspection, verification, integration, and final user communication

For mixed work, Codex settles the design and acceptance criteria before
delegating implementation. When repeated attempts make no progress, reassess the
approach or take the task back into the parent.

## Boundaries

A fresh Claude session starts without this conversation's context. Every fresh
prompt must carry the objective, repository, constraints, authority boundary,
success criteria, and proof expected. A resumed session keeps its context, so a
follow-up prompt carries only the revision boundary, the correction, and the
proof expected. Inside T3 Code the worker skills run Claude as a T3 child task
instead of the Claude CLI; a child task cannot be resumed, so its follow-up is a
fresh prompt that also carries the earlier brief and result. Prohibit further
native or CLI model delegation unless explicitly authorized. The headless runner
denies native worker tools and delegation skills, but a T3 child task does not,
so there the prompt is the only guard.

Treat Claude's report as evidence. Inspect the repository state and fill missing
or invalidated verification before presenting the result. Use review-code for
requested or required reviews.
