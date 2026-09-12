---
name: codex-first
description: >-
  Explicit session mode using Codex CLI for implementation while Claude owns
  decisions and delivery. Never infer from ordinary work.
---

# Codex First

An opt-in routing posture: once the user invokes it, Codex is the default
executor for hands-on work and Claude spends its tokens on specs, judgement, and
verification. It stays in effect for the rest of the session unless the user
says otherwise; "do this one yourself" overrides it for a single task.

## Route

Delegate to Codex (the default for hands-on work):

- Implementation from a frozen spec; refactors; mechanical migrations
- Bug fixes with a known repro; test writing; coverage fills
- CI fixes, dependency bumps, scripts and tooling
- Bulk exploration or reading where raw throughput beats careful reasoning

Keep in Claude:

- Design, API design, architecture, naming, UX judgement
- Tasks where writing the spec IS the work (ambiguity means design)
- Tiny obvious edits where delegation overhead outweighs the benefit
- Anything needing session tools: MCP servers, Claude's own authenticated
  browser sessions, secrets. Fresh local browser, desktop, or simulator
  automation is `codex-computer-use` work.
- Destructive or irreversible ops, releases, pushes, GitHub mutations
- Final review judgment and verification of Codex output; use review-code for
  reviewer selection

Heuristics:

- Mixed task: Claude designs first, freezes the spec, then delegates the
  build-out.
- If the prompt reads as a work order, delegate; if writing it forces decisions,
  it is design — Claude keeps it.
- When repeated attempts make no progress, reassess or take the task back.

## Mechanics

This skill decides whether and what to delegate; the matching codex-\* skill
decides how. Route through:

- `codex-implementation` — bounded code changes (worktree isolation, prompt
  contract, iteration, delivery, cleanup)
- `codex-analysis` — read-only bulk reading, extraction, and investigation
- `codex-review` — independent review of Claude-authored work
- `codex-computer-use` — GUI/runtime observation and verification

The worker skill owns sandbox, checkout isolation, artifact handling, and
continuation mechanics. Follow it rather than duplicating invocation policy.

## Prompt Contract

A fresh Codex session starts with zero context. Every fresh prompt carries:
goal, exact repo and paths, constraints and non-goals, proof expected (the exact
test command), and output shape. A resumed session keeps its context, so a
follow-up prompt carries only the revision boundary, the correction, and the
proof expected. Prohibit further native or CLI model delegation unless the
parent explicitly authorized that structure.

## Verify and deliver

Inspect all changed paths and commits since the worker's starting revision.
Treat its report as evidence, verify consequential claims, and fill missing or
invalidated checks instead of repeating valid ones. Use review-code when review
is requested or required; fresh same-engine review is valid but not
cross-engine. Do not add reviewers merely because work was delegated.

Resume relevant task sessions for corrections. If repeated attempts make no
progress, reassess the approach or take the task back into the parent. Final
judgment and delivery remain with Claude.
