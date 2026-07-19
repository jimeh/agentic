<!--
Add Claude-specific global rules here. This file is appended after
rules/base.md when `agent-config rules build` renders generated/CLAUDE.md.
-->

## Execution Mode

- Do the work directly in the current Claude session by default.
- Do not delegate, spawn subagents, launch workflows, or request independent
  reviews unless the user explicitly asks for multi-agent execution, subagents,
  or a workflow, or invokes a named skill whose documented workflow requires
  them.
- For ordinary single-agent work, do not apply the model routing table. The
  current model owns investigation, implementation, verification, and review.
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
- Do not let parallel implementation agents edit the same checkout. Use isolated
  worktrees.
- Reconcile delegated results before acting on them.
- Do not silently add agents or reviewers beyond the requested or documented
  workflow scope.

### Delegation vs Workflows

- Within the requested scope, use the matching repo-owned skill for bounded
  delegation such as investigation, implementation, review, reproduction, data
  extraction, or computer use.
- Use native Claude subagents when the user explicitly requests them, a selected
  workflow requires a separate Claude context, or delegated work should run on a
  GPT model exposed through the configured gateway.
- Use workflows for deterministic fan-out/fan-in within a task: parallel sweeps,
  staged find-then-verify pipelines, or migrations over a work list.
- For long-running delegated work, ask for a report file and poll for it.

### Model Routing

Cost is the effective cost to me, including actual spend and scarcity from usage
limits. It does not include model-selection or invocation friction. Intelligence
is how hard a problem the model handles unsupervised. Taste covers UI/UX, API
design, code quality, and copy. Update the table when available models change.

| Claude Code model | agent          | cost | intelligence | taste | role                   |
| ----------------- | -------------- | ---: | -----------: | ----: | ---------------------- |
| gpt-5.6-sol       | `sol`          |    8 |            9 |     7 | substantive execution  |
| gpt-5.6-terra     | `terra`        |    5 |            8 |     7 | mechanical execution   |
| fable-5           | current Claude |   10 |            9 |     9 | judgement and planning |

- The `sol` and `terra` custom agents pin their GPT models; omit the Agent
  tool's per-call `model` parameter when invoking them.
- These are defaults, not limits. Judge output quality, not the price tag.
- Cost is only a tie-breaker; for anything that ships, intelligence > taste >
  cost.
- Use the `sol` agent for bounded implementation, large read-only analysis,
  independent review, technical reasoning, and broad evidence gathering.
- Use the `terra` agent only for simple, bounded mechanical work after the hard
  planning and reasoning are complete. Give it a settled plan, explicit steps,
  and concrete acceptance criteria; keep unresolved judgement in Fable or Sol.
- Use `fable-5` in the current Claude session for complex or ambiguous
  investigation, debugging, root-cause analysis, high-level planning,
  decomposition, architecture, API and UX decisions, agent orchestration,
  synthesis, and final judgement.
- Do not use Haiku.
- If delegated output is below the bar, iterate with the selected agent or take
  the work back into the current session. Ask before adding another worker
  beyond the approved scope.

### GPT Models in Claude Code

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
- Implementation delegation requires isolation such as a separate worktree.

### Independent Review

- Use an independent reviewer only when the user requests one or the selected
  workflow explicitly requires one.
- Review Fable-authored diffs through a fresh `sol` agent. Review Sol- or
  Terra-authored diffs directly in the current Fable session; do not send them
  back to the authoring model for same-model review.
- The reviewer must run in a separate context from the authoring agent.
  Cross-model review improves independence, but the orchestrator retains final
  judgement and reconciles the findings.
- Spawned Claude reviewers and workers do not inherit the session model; pass
  `model: "fable"` explicitly on the Agent call. Never let a delegated Claude
  fall back to Opus, Sonnet, or Haiku by omission.
- Add a second reviewer only when the user requests one or the selected workflow
  explicitly requires one.

## Browser and GUI Automation

- Use `agent-browser` directly for quick, small browser interactions such as
  opening a page, clicking, filling a form, capturing a screenshot, or
  extracting data.
- For desktop apps, simulators, or other non-browser GUI flows, use the direct
  GUI tooling available in the current harness.
