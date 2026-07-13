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
- Use native Claude subagents only when the user explicitly requests them or a
  selected workflow requires a separate Claude context. Do not use them to route
  work to GPT or Codex models.
- Use workflows for deterministic fan-out/fan-in within a task: parallel sweeps,
  staged find-then-verify pipelines, or migrations over a work list.
- For long-running delegated work, ask for a report file and poll for it.

### Model Routing

Cost is the effective cost to me, including actual spend and scarcity from usage
limits. It does not include model-selection or invocation friction. Intelligence
is how hard a problem the model handles unsupervised. Taste covers UI/UX, API
design, code quality, and copy. Update the table when available models change.

| Model                   | execution route  | cost | intelligence | taste | role                               |
| ----------------------- | ---------------- | ---: | -----------: | ----: | ---------------------------------- |
| gpt-5.6-sol / Codex CLI | `codex-*` skills |    8 |            9 |     7 | substantive execution              |
| fable-5                 | current Claude   |   10 |            9 |     9 | judgement, investigation, planning |

- These are defaults, not limits. Judge output quality, not the price tag.
- Cost is only a tie-breaker; for anything that ships, intelligence > taste >
  cost.
- Use `gpt-5.6-sol` through the matching `codex-*` skill for bounded
  implementation, large read-only analysis, independent review, computer use,
  and broad evidence gathering.
- Use `fable-5` in the current Claude session for complex or ambiguous
  investigation, debugging, root-cause analysis, high-level planning,
  decomposition, architecture, API and UX decisions, agent orchestration,
  synthesis, and final judgement.
- Do not use Haiku.
- If delegated output is below the bar, iterate through the selected skill or
  take the work back into Claude. Ask before adding another worker beyond the
  approved scope.

### Delegation to Codex CLI

- Reach Codex through the matching `codex-*` skill:
  - `codex-analysis` for read-only analysis, investigation, extraction, and
    broad evidence gathering.
  - `codex-review` for independent review of Claude-authored work.
  - `codex-implementation` for bounded, well-specified code changes.
  - `codex-computer-use` for GUI and runtime observation or verification.
- Use `codex-first` only when the user explicitly opts into Codex-led hands-on
  work for the task or session.
- Use the raw `codex` CLI only when no skill fits or the user explicitly asks
  for it.
- Do not route GPT or Codex work through Claude's Agent model parameter or the
  `sol` and `terra` custom agents.
- Implementation delegation requires isolation such as a separate worktree.

### Independent Review

- Use an independent reviewer only when the user requests one or the selected
  workflow explicitly requires one.
- Review Claude-authored diffs through `codex-review`. Review Codex-authored
  diffs directly in the current Claude session; do not send them back to Codex
  for same-model review.
- The reviewer must run in a separate context from the authoring agent.
  Cross-model review improves independence, but the orchestrator retains final
  judgement and reconciles the findings.
- Add a second reviewer only when the user requests one or the selected workflow
  explicitly requires one.

## Browser and GUI Automation

- Use `agent-browser` directly for quick, small browser interactions such as
  opening a page, clicking, filling a form, capturing a screenshot, or
  extracting data.
- Use `codex-computer-use` for complicated or long-running flows such as
  multi-step user journeys, desktop apps, simulators, or repeated GUI steps.
