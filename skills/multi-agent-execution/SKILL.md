---
name: multi-agent-execution
description: >-
  How to delegate work across subagents and workflows: decomposition, model
  routing, and independent review. Load when the user requests multi-agent
  execution or an invoked skill's workflow calls for delegation.
---

# Multi-Agent Execution

Use this skill when multi-agent execution is active, either because the user
requested it or an invoked workflow calls for delegation. The invoking workflow
decides whether and when to delegate; this skill governs decomposition, routing,
isolation, and review once that decision is made.

## Delegation

- Decompose the goal, route bounded work, then integrate and validate the
  results.
- Give each delegated task clear scope, inputs, outputs, and acceptance
  criteria. Split work before delegating; one deliverable per agent.
- Never delegate final judgement.
- Give every concurrent implementation agent a dedicated worktree, and never let
  multiple implementation agents edit the same checkout. For one implementer,
  use the topology selected by the invoking workflow; it is authoritative for
  that task. Otherwise follow the delegated implementation skill. When neither
  defines one, prefer the current checkout if it can grant exclusive mutation
  ownership and safely account for every change. Isolate when shared state,
  unrelated dirt, destructive verification, or concurrent mutation creates
  concrete conflict or attribution risk.
- Reconcile delegated results before acting on them.
- Do not silently add agents or reviewers beyond the requested or documented
  workflow scope.

## Delegation vs Workflows

- Within the requested scope, use the matching repo-owned skill for bounded
  delegation such as investigation, implementation, review, reproduction, data
  extraction, or computer use.
- Use native Claude subagents when the user explicitly requests them or a
  selected workflow calls for a separate Claude context.
- Use workflows for deterministic fan-out/fan-in within a task: parallel sweeps,
  staged find-then-verify pipelines, or migrations over a work list.
- For long-running delegated work, ask for a report file and poll for it.

## Model Routing

- Opus is the usual choice for delegated Claude work: investigation,
  implementation, verification, review, planning, decomposition, architecture,
  API and UX decisions, and synthesis.
- Fable suits exceptionally hard problems — ambiguous root-cause work Opus has
  stalled on, high-stakes architecture, or synthesis across large conflicting
  evidence. A `model: "fable"` subagent with a scoped brief is usually enough;
  the current session stays orchestrator and keeps final judgement. Fable is the
  smarter model, but Opus often writes better code; judge the work rather than
  the ranking.
- Hand GPT work to the `codex-*` skills, which wrap the Codex CLI. Prefer Claude
  models unless the user asks for GPT or Codex, a skill or workflow needs that
  engine, or the work calls for it — cross-model review independence, bulk
  read-only throughput, or capacity running alongside the current session.
- Match the current session's model when spawning Claude agents, unless the work
  calls for a different one. Subagents fall back to a default when `model` is
  omitted, so pass it explicitly.
- Do not use Haiku.
- If delegated output is below the bar, iterate with the selected agent or take
  the work back into the current session. Ask before adding another worker
  beyond the approved scope.

## Independent Review

- When a selected skill or workflow defines its own review channels, follow it.
  The rest of this section is the default for reviews it does not specify.
- Review any diff in a fresh context, whatever authored it. Never continue the
  authoring context or hand the diff back to the authoring agent.
- A fresh context on the same model is the baseline, and a different model is
  more independent. Use `fable` when the stakes justify a harder reviewer, and
  route to a `codex-*` skill for cross-engine independence when the user asks
  for it or the workflow calls for it.
- Spawned Claude reviewers and workers do not inherit the session model; pass
  `model` explicitly on the Agent call, either to match the current session or
  to span models deliberately. Never let a delegated Claude fall back to Sonnet
  or Haiku by omission.
