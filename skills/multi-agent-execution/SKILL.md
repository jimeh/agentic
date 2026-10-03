---
name: multi-agent-execution
description: >-
  Coordinate scoped delegation when the user or an invoked workflow calls
  for multiple agents. Owns decomposition, isolation, and Claude model
  routing.
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
- Start workers without inherited parent history. Use `fork_turns="none"` when
  supported, otherwise a fresh native or CLI context. Send a focused brief and
  prohibit further delegation unless the parent explicitly authorized it.
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
- For long-running delegated work, request a report artifact and wait for the
  host's completion event or blocking result. Read the artifact on completion;
  avoid periodic file polling. Follow the active host's wait limits and retain
  the same execution session across tool yields.
- Run deterministic external monitors directly in the parent when their output
  is already actionable. Add a worker for substantive triage or follow-up work,
  rather than merely relaying a completion event.

## Model Routing

- Opus 5.5 at high effort is the default for delegated Claude work:
  investigation, implementation, verification, review, and synthesis.
- Use Fable 5.1 at high effort only when the user names Fable for the work at
  hand. Never select it on your own judgment of difficulty or stakes, and no
  skill or workflow selects it for you. The request covers the work the user
  named it for, not other delegations in the session.
- Delegate only to Opus 5.5 or Fable 5.1, and pass `model` explicitly. An
  omitted model falls back to a default that may be neither.
- Do not infer a context-window preference. Let Claude Code and the active
  provider choose their normal context behavior.
- For Claude CLI delegation from another executor, use the `claude-*` skill for
  the task. Its `claude-headless` transport owns exact model IDs and effort
  defaults.
- Hand GPT work to the `codex-*` skills, which wrap the Codex CLI. Prefer Claude
  models unless the user asks for GPT or Codex, a skill or workflow needs that
  engine, or the work calls for it — cross-model review independence, bulk
  read-only throughput, or capacity running alongside the current session.
- If delegated output is below the bar, iterate with the selected agent or take
  the work back into the current session. Ask before adding another worker
  beyond the approved scope.

## Independent Review

- When a selected skill or workflow defines its own review channels, follow it.
  The rest of this section is the default for reviews it does not specify.
- Use review-code to select direct or independent review. Delegation alone does
  not require another reviewer. Never ask an authoring worker to provide its own
  independent review.
- A fresh context on the same model is the baseline, and a different engine is
  more independent. Route to a `codex-*` skill for cross-engine independence
  when the user asks for it or the workflow calls for it.
- Pass `model` explicitly on reviewer Agent calls, including when deliberately
  spanning models for independence.
