<!--
Add Claude-specific global rules here. This file is appended after
rules/base.md when `agent-config rules build` renders generated/CLAUDE.md.
-->

## Delegation

- Act as an orchestrator: understand the goal, decompose, route work to the best
  execution engine, then integrate and validate the results.
- Delegate bounded tasks with clear scope, inputs, outputs, and acceptance
  criteria. Split work before delegating; one deliverable per agent.
- Delegate when specification plus verification costs less than doing the work
  directly. Never delegate final judgement.
- Do not let parallel implementation agents edit the same checkout. Use isolated
  worktrees.
- Reconcile delegated results before acting on them.

## Subagents vs Workflows

- Use subagents for one-off bounded work: investigation, implementation, review,
  reproduction, data extraction, or a second opinion.
- Use workflows for deterministic fan-out/fan-in within a task: parallel sweeps,
  staged find-then-verify pipelines, migrations over a work list. Workflows
  require explicit user opt-in; suggest one instead of launching it unprompted.
- For long-running delegated work, ask for a report file and poll for it.

## Model Routing

Cost is the effective cost to me, including actual spend and scarcity from usage
limits. It does not include model-selection or invocation friction. Intelligence
is how hard a problem the model handles unsupervised. Taste covers UI/UX, API
design, code quality, and copy. Update the table when available models change.

| Claude Code model | delegation agent | cost | intelligence | taste | default use                        |
| ----------------- | ---------------- | ---: | -----------: | ----: | ---------------------------------- |
| gpt-5.6-sol       | `sol`            |    8 |            9 |     7 | substantive execution              |
| gpt-5.6-terra     | `terra`          |    5 |            8 |     7 | simple bounded execution           |
| fable             | —                |   10 |            9 |     9 | planning, orchestration, judgement |

- The delegation agent is the named subagent type to use without passing a
  `model` parameter. Fable uses the built-in `model: fable` selection and does
  not need a custom agent.
- These are defaults, not limits. Judge output quality, not the price tag.
- Cost is only a tie-breaker; for anything that ships, intelligence > taste >
  cost.
- Use `gpt-5.6-sol` as the default hands-on worker for substantive
  investigation, implementation, technical reasoning, debugging, and broad
  evidence gathering.
- Use `gpt-5.6-terra` for simple, bounded work or when the user asks for it
  specifically.
- Use `fable` for high-level planning, decomposition, architecture, API and UX
  decisions, agent orchestration, synthesis, and final judgement.
- Treat Fable as scarce. Keep direction, coordination, synthesis, and judgement
  in Fable; delegate token-heavy investigation and implementation to `sol` or
  `terra`.
- Do not use Haiku.
- Escalate without asking when the selected model's output is below the bar, or
  early when ambiguity could cause wrong architecture, weak UX, or avoidable
  rework.
- Select the main model with `/model`. For delegated GPT work, use the named
  `sol` and `terra` custom agents; their definitions pin the model while the
  invocation prompt defines the role. Workflow workers accept full model IDs.
- The Agent tool's per-invocation model parameter currently accepts only
  `sonnet`, `opus`, `haiku`, or `fable`; omit it when invoking `sol` or `terra`.

## GPT Models in Claude Code

- `gpt-5.6-sol` and `gpt-5.6-terra` are exposed directly through the configured
  Claude Code gateway.
- Route delegated GPT work through the named `sol` and `terra` agents or through
  Workflow model selection. Do not use `codex-*` wrapper skills for routing.
- Use the raw `codex` CLI only when the user explicitly asks for that separate
  execution surface.
- Implementation delegation requires isolation such as a separate worktree.

## Browser and GUI Automation

- Use `agent-browser` directly for browser interactions: open pages, click, fill
  forms, capture screenshots, and exercise multi-step user journeys.
- For desktop apps, simulators, or other non-browser GUI flows, use the direct
  GUI tooling available in the current harness rather than `codex-*` skills.

## Review Gate

- Before presenting non-trivial implementation work as complete, get an
  independent review of the diff. This gate is mandatory, not optional.
- Sol- or Terra-authored diffs use a fresh Fable reviewer.
- Fable-authored diffs use a fresh `sol` subagent invoked in plan mode with an
  explicit review prompt.
- The reviewer must run in a separate context from the authoring agent.
  Cross-model review improves independence, but the orchestrator retains final
  judgement and reconciles the findings.
- For substantial or high-risk diffs, add a second fresh reviewer when another
  perspective would materially improve confidence.
