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
- Delegated implementation requires isolation such as a separate worktree. Never
  let parallel implementation agents edit the same checkout.
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

Cost is the effective cost to me, including actual spend and scarcity from usage
limits. It does not include model-selection or invocation friction. Intelligence
is how hard a problem the model handles unsupervised. Taste covers UI/UX, API
design, code quality, and copy. Update the table when available models change.

| Claude Code model | invoke as        | cost | intelligence | taste | role                   |
| ----------------- | ---------------- | ---: | -----------: | ----: | ---------------------- |
| gpt-5.6-terra     | `terra`          |    2 |            6 |     7 | mechanical execution   |
| gpt-5.6-sol       | `sol`            |    4 |            9 |     7 | substantive execution  |
| opus-5            | `model: "opus"`  |    5 |            9 |    10 | default Claude work    |
| fable-5           | `model: "fable"` |   10 |           10 |     9 | exceptional complexity |

- Spawned agents default to the current session's model. Claude subagents do not
  inherit it automatically, so pass `model` explicitly to match the parent.
  Consult this table when a subagent should span models rather than match.
- Prefer Claude models for delegated work. Reach for `sol`, `terra`, or the
  `codex-*` skills when the user asks for GPT or Codex, when a selected skill or
  workflow needs that engine, or when the work itself calls for it — cross-model
  review independence, bulk read-only throughput, or capacity running alongside
  the current session.
- When picking a Claude model deliberately, `opus-5` is the default tier:
  investigation, implementation, verification, review, planning, decomposition,
  architecture, API and UX decisions, and synthesis.
- Reserve `fable-5` for exceptionally hard problems — ambiguous root-cause work
  Opus has stalled on, high-stakes architecture, or synthesis across large
  conflicting evidence. A `model: "fable"` subagent with a scoped brief is
  usually enough; the current session stays orchestrator and keeps final
  judgement.
- The `sol` and `terra` custom agents pin their GPT models; omit the Agent
  tool's per-call `model` parameter when invoking them.
- These are defaults, not limits. Judge output quality, not the price tag: cost
  is only a tie-breaker, and for anything that ships, intelligence > taste >
  cost.
- Use the `sol` agent for bounded implementation, large read-only analysis,
  independent review, technical reasoning, and broad evidence gathering.
- Use the `terra` agent only for simple, bounded mechanical work after the hard
  planning and reasoning are complete. Give it a settled plan, explicit steps,
  and concrete acceptance criteria; keep unresolved judgement in Opus or Sol.
- Do not use Haiku.
- If delegated output is below the bar, iterate with the selected agent or take
  the work back into the current session. Ask before adding another worker
  beyond the approved scope.

### GPT Models in Claude Code

Apply this section when routing work to GPT models. It covers how to reach them,
not when to choose them.

- The `sol` and `terra` agents resolve their GPT models only when Claude Code
  was launched against CLIProxyAPI. The agent definitions are always listed
  regardless, so listing alone proves nothing.
- Before first routing GPT work in a session, probe once with
  `printenv ANTHROPIC_BASE_URL` and cache the result for the session:
  - Set → gateway mode. Route delegated GPT work through the `sol` or `terra`
    custom agent, or through Workflow model selection. Do not use `codex-*`
    wrapper skills for routing.
  - Unset → direct mode. `sol`/`terra` model pins will not resolve; do not spawn
    them. Route GPT work through the `codex-*` skills instead (`codex-review`,
    `codex-implementation`, `codex-analysis`, `codex-first`,
    `codex-computer-use`), which wrap the codex CLI. Note the routing mode in
    the final report.
- Where a skill or workflow names a GPT/Codex reviewer or worker by engine,
  satisfy it with the mechanism the current mode provides; the engine
  requirement, not the mechanism, is the contract.
- Use the raw `codex` CLI only when the user explicitly asks for that separate
  execution surface, or as a last-resort fallback when the `codex-*` skills are
  unavailable in direct mode.

### Independent Review

- When a selected skill or workflow defines its own review channels, follow it.
  The rest of this section is the default for reviews it does not specify.
- Review any diff in a fresh context, whatever authored it. Never continue the
  authoring context or hand the diff back to the authoring agent.
- A fresh context on the same model is the baseline, and a different model is
  more independent. Use `fable` when the stakes justify a harder reviewer, and
  route to `sol` or a `codex-*` skill for cross-engine independence when the
  user asks for it or the workflow requires it.
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
