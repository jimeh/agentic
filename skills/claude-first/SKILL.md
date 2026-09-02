---
name: claude-first
description: >-
  Opt-in session mode making the Claude Code CLI the default implementer and
  bulk-analysis engine while Codex specifies, reviews, verifies, and delivers.
  Ordinary implementation requests never trigger it.
---

# Claude First

This is an explicit routing posture. Once the user invokes it, use Claude as the
default executor for suitable hands-on work for the rest of the session. "Do
this one yourself" overrides it for one task; the user can end the mode at any
time.

Fable 5.1 at medium effort is the default delegated model. "Opus" means Opus 5
at medium effort. Honor explicit model and effort overrides.

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
delegating implementation. After two failed correction rounds, stop delegating
and finish directly.

## Boundaries

Claude starts without this conversation's context. Every prompt must carry the
objective, repository, constraints, authority boundary, success criteria, and
proof expected. Tell Claude not to invoke `codex-*` skills or the Codex CLI; the
`claude-headless` runner also denies that recursion path.

Treat Claude's report as evidence. Inspect the repository state and run the
relevant checks yourself before presenting the result.
