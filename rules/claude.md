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

Cost is what I actually pay, not list price. Intelligence is how hard a problem
the model handles unsupervised. Taste covers UI/UX, API design, code quality,
and copy. Update the table when available models change.

| model    | cost | intelligence | taste | default use                 |
| -------- | ---: | -----------: | ----: | --------------------------- |
| gpt-5.5  |    9 |            8 |     5 | bulk work, logs, specs      |
| sonnet-5 |    6 |            5 |     7 | thin wrappers, routine work |
| opus-4.8 |    4 |            8 |     8 | review, architecture        |
| fable-5  |    2 |            9 |     9 | UX, APIs, copy, judgement   |

- These are defaults, not limits. Judge output quality, not the price tag.
- Cost is only a tie-breaker; for anything that ships, intelligence > taste >
  cost.
- Bulk, mechanical, token-heavy, or clear-spec work goes to gpt-5.5 / Codex.
  Spend cheap tokens gathering evidence before expensive judgement.
- User-facing work needs taste >= 7: UI, UX, copy, API shape, naming, product
  decisions, and final polish.
- Reviews of plans or implementations use fable-5 or opus-4.8; add gpt-5.5 /
  Codex as an extra independent perspective when useful.
- Do not use Haiku.
- Escalate to a smarter model without asking when a cheaper model's output is
  below the bar, or early when ambiguity could cause wrong architecture, weak
  UX, or avoidable rework.
- Claude models run via the Agent/Workflow model parameter.

## Delegation to Codex / GPT-5.5

- Reach Codex through the codex-\* skills; pick the matching skill
  automatically:
  - `codex-analysis` — read-only analysis over large context (logs, PDFs, specs,
    broad searches).
  - `codex-review` — independent review of a diff, branch, or commit.
  - `codex-implementation` — bounded, well-specified code changes.
  - `codex-computer-use` — GUI/runtime observation and verification.
- Raw `codex` CLI is a fallback for read-only investigation when no skill fits,
  or when the user explicitly asks.
- When the user invokes the `codex-first` skill or asks for Codex to lead the
  hands-on implementation work, Codex becomes the default implementer for the
  session per that skill's routing. A one-off Codex request (a single review,
  analysis, or task) is not an opt-in. Never adopt that posture uninvited.
- Label wrapper agents with a `codex:` or `gpt-5.5:` prefix so the real worker
  is visible.
- Implementation delegation requires isolation such as a separate worktree.

## Browser and GUI Automation

- Use `agent-browser` directly for quick, small page interactions: open a page,
  click, fill a form, grab a screenshot or some data.
- Use `codex-computer-use` for complicated or long-running flows: multi-step
  user journeys, desktop apps, simulators, or repeated GUI steps.

## Review Gate

- Before presenting non-trivial implementation work as complete, get an
  independent review of the diff. This gate is mandatory, not optional.
- Claude-authored diffs: review via `codex-review`, or a fresh subagent when
  Codex is unavailable.
- Codex-authored diffs: Claude reviews the diff itself — same-model review is
  weak independence, so do not send them to `codex-review`. For substantial
  diffs, also get a fresh Claude subagent review, since the orchestrating
  session wrote the spec and is not fully neutral.
