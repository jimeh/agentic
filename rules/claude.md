---
type: agentic-rules
filename: CLAUDE.md
---

<!-- include: base.md -->

## Execution Mode

- Do the work directly in the current Claude session by default.
- Do not delegate, spawn subagents, launch workflows, or request independent
  reviews unless the user explicitly asks for multi-agent execution, subagents,
  or a workflow, or invokes a named skill whose documented workflow requires
  them.
- For ordinary single-agent work, do not apply the model routing table.
- You may suggest multi-agent execution when it would materially help, but wait
  for approval before starting it.

## Opt-In Multi-Agent Execution

Apply this section only after the user has opted into multi-agent execution or
invoked a named skill whose documented workflow requires it.

### Delegation

- Decompose the goal, route bounded work, then integrate and validate the
  results.
- Give each delegated task clear scope, inputs, outputs, and acceptance
  criteria. Split work before delegating; one deliverable per agent.
- Never delegate final judgement.
- Give delegated implementation a dedicated worktree for substantial or parallel
  tasks, and never let multiple implementation agents edit the same checkout.
  The current checkout is for small, low-risk edits where isolation adds more
  overhead than value.
- Reconcile delegated results before acting on them.
- Do not silently add agents or reviewers beyond the requested or documented
  workflow scope.

### Delegation vs Workflows

- Within the requested scope, use the matching repo-owned skill for bounded
  delegation such as investigation, implementation, review, reproduction, data
  extraction, or computer use.
- Use native Claude subagents when the user explicitly requests them or a
  selected workflow requires a separate Claude context.
- Use workflows for deterministic fan-out/fan-in within a task: parallel sweeps,
  staged find-then-verify pipelines, or migrations over a work list.
- For long-running delegated work, ask for a report file and poll for it.

### Model Routing

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

### Independent Review

- When a selected skill or workflow defines its own review channels, follow it.
  The rest of this section is the default for reviews it does not specify.
- Review any diff in a fresh context, whatever authored it. Never continue the
  authoring context or hand the diff back to the authoring agent.
- A fresh context on the same model is the baseline, and a different model is
  more independent. Use `fable` when the stakes justify a harder reviewer, and
  route to a `codex-*` skill for cross-engine independence when the user asks
  for it or the workflow requires it.
- Spawned Claude reviewers and workers do not inherit the session model; pass
  `model` explicitly on the Agent call, either to match the current session or
  to span models deliberately. Never let a delegated Claude fall back to Sonnet
  or Haiku by omission.

## Browser and GUI Automation

- Use `agent-browser` directly for quick, small browser interactions such as
  opening a page, clicking, filling a form, capturing a screenshot, or
  extracting data.
- For desktop apps, simulators, or other non-browser GUI flows, use the direct
  GUI tooling available in the current harness.

@RTK.md
