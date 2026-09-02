---
name: codex-first
description: >-
  Opt-in session mode making the Codex CLI the default implementer while Claude
  specs, reviews, and verifies. Requires an explicit opt-in; ordinary
  implementation requests never trigger it.
---

# Codex First

An opt-in routing posture: once the user invokes it, Codex is the default
executor for hands-on work and Claude spends its tokens on specs, judgement, and
verification. It stays in effect for the rest of the session unless the user
says otherwise; "do this one yourself" overrides it for a single task.

Rationale: Claude tokens are metered and expensive; Codex is flat-rate and fast
at writing code. Claude wins at judgement, design, spec-writing, review, and
orchestration. So Codex types, Claude thinks and verifies.

## Route

Delegate to Codex (the default for hands-on work):

- Implementation from a frozen spec; refactors; mechanical migrations
- Bug fixes with a known repro; test writing; coverage fills
- CI fixes, dependency bumps, scripts and tooling
- Bulk exploration or reading where raw throughput beats careful reasoning

Keep in Claude:

- Design, API design, architecture, naming, UX judgement
- Tasks where writing the spec IS the work (ambiguity means design)
- Tiny edits (roughly under 20 lines, one obvious change) — delegation overhead
  loses
- Anything needing session tools: MCP servers, Claude's own authenticated
  browser sessions, secrets. Fresh local browser, desktop, or simulator
  automation is `codex-computer-use` work.
- Destructive or irreversible ops, releases, pushes, GitHub mutations
- Review and verification of Codex output — never delegated, never skipped

Heuristics:

- Mixed task: Claude designs first, freezes the spec, then delegates the
  build-out.
- If the prompt reads as a work order, delegate; if writing it forces decisions,
  it is design — Claude keeps it.
- After two failed delegation rounds on the same task, take over and do it
  directly.

## Mechanics

This skill decides whether and what to delegate; the matching codex-\* skill
decides how. Route through:

- `codex-implementation` — bounded code changes (worktree isolation, prompt
  contract, iteration, delivery, cleanup)
- `codex-analysis` — read-only bulk reading, extraction, and investigation
- `codex-review` — independent review of Claude-authored work
- `codex-computer-use` — GUI/runtime observation and verification

House invocation conventions hold in this mode: sandboxed `codex-headless` runs
(`--sandbox read-only` / `--sandbox workspace-write`, with
`--sandbox danger-full-access` only where `codex-computer-use` calls for it),
isolated worktrees for non-trivial edits, prompts via temp file, results and
progress in the runner's artifact directory. Do not use
`--dangerously-bypass-approvals-and-sandbox` or equivalents; the runner rejects
them.

## Prompt Contract

A fresh Codex session starts with zero context. Every fresh prompt carries:
goal, exact repo and paths, constraints and non-goals, proof expected (the exact
test command), and output shape. A resumed session keeps its context, so a
follow-up prompt carries only the revision boundary, the correction, and the
proof expected. Spec quality decides success.

## Verify (Claude, Always)

- Read the full diff (`git status`, `git diff`) and judge it like a contributor
  PR.
- Run focused tests yourself or demand proof output; Codex claims are advisory.
- Iterate with `codex-headless --resume` per `codex-implementation`; after two
  failed rounds, take over.
- The review gate still applies: Claude reviews Codex-authored diffs itself — do
  not send them back to `codex-review`, since same-model review is weak
  independence. Add another reviewer only when the user requests one or the
  selected workflow explicitly requires one.

## Economics

The win is moving generation and exploration tokens to Codex while Claude spends
only on spec plus diff review. Do not ping-pong trivia through delegation, and
do not re-read what Codex already summarized.
