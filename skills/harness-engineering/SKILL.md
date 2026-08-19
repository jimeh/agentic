---
name: harness-engineering
description: >-
  Shape a repository so coding agents work reliably in it: evidence-led project
  instructions, legible knowledge, runnable feedback loops, early local
  enforcement, enforceable architecture rules, and cleanup processes. Use for
  agent-readiness audits, creating or refining repo-specific agent guidance
  such as AGENTS.md files, and turning repeated agent failures into durable
  repo-local tooling.
---

# Harness Engineering

## Overview

Shape a repository into a practical agent harness: easy to navigate, easy to
validate, hard to drift, and explicit about the constraints agents must obey.
Optimize for repo-local systems that compound across future agent runs. Reduce
agent uncertainty and make wrong turns fail early, locally, and with actionable
remediation.

Harness engineering is not prompt polishing. Treat repeated agent mistakes, slow
handoffs, and review-only failures as missing repo capabilities: unclear maps,
inaccessible signals, weak tests, unenforced boundaries, stale docs, or absent
cleanup loops.

Think in five parts:

- **Guides**: docs, skills, task names, examples, templates, and maps that steer
  agents before they act.
- **Sensors**: fast feedback checks, tests, linters, type checks, logs, CI,
  screenshots, review agents, and other signals that let agents detect and
  correct mistakes.
- **Enforcement**: the earliest sound trigger for each sensor, such as targeted
  iteration, pre-commit, handoff, CI, or scheduled maintenance.
- **Task surface**: stable commands agents can discover and run without
  guessing.
- **Cleanup**: recurring checks and small refactors that keep the harness fresh.

## Workflow

### 1. Classify the Request

Pick the smallest useful mode:

- **Audit**: assess current readiness and propose prioritized changes.
- **Bootstrap**: create initial docs, scripts, checks, or harness conventions.
- **Refine project instructions**: derive or improve repo-specific `AGENTS.md`
  guidance from project evidence and maintainer intent.
- **Author agent guidance**: shape repo-owned instructions, rules, linked docs,
  or project-local skills without replacing format-specific authoring tools.
- **Refactor knowledge**: turn scattered instructions into progressive
  disclosure.
- **Encode rules**: convert recurring review feedback into mechanical checks.
- **Build feedback loops**: make app state, tests, logs, screenshots, or CI
  failures directly inspectable by agents.
- **Place validation**: wire fast checks into pre-commit or another early
  trigger while keeping broader checks explicit and avoiding duplicate evidence.
- **Standardize task surface**: expose setup, dev, build, format, lint,
  typecheck, check, test, verify, doctor, and cleanup commands through existing
  project tooling or `mise`.
- **Harden dependency intake**: add package-manager cooldowns, lockfile policy,
  GitHub Actions pinning, and workflow checks when the ecosystem supports them.
- **Garbage collect**: find drift and create small cleanup work items.

If the user asks to "make changes", "bootstrap", "add", "fix", or similar,
implement the focused harness improvement. If they ask to "consider", "audit",
"plan", or "explore", return a plan before editing. If they explicitly ask to
improve an agent harness setup, proceed without asking for more confirmation
unless the change would be unusually broad or risky.

Bias toward changes that compound: one good command, check, fixture, map, or
diagnostic should make many future agent runs easier. Prefer early mechanical
failure over late human review whenever the rule can be checked.

### 2. Read the Project as the Agent Will

Inspect, in this order:

1. Root instructions: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`,
   `.github/copilot-instructions.md`.
2. Setup and validation: `README.md`, `Makefile`, package scripts, task runners,
   CI workflows, test configs.
3. Local enforcement: hook-manager config, `core.hooksPath`, setup/install
   tasks, staged-file scope, write behavior, and measured warm runtime when
   practical.
4. Architecture and product docs: `docs/`, `ARCHITECTURE.md`, design docs, ADRs,
   schemas, generated references.
5. Agent affordances: browser automation, local dev boot scripts, local skills,
   log access, fixtures, seed data, screenshots, traces, PR/CI tooling.
6. Mechanical constraints: linters, dependency rules, type checks, structural
   tests, naming checks, file size checks, custom diagnostics.
7. Supply-chain controls: lockfiles, package-manager age gates, GitHub Actions
   pins, action/workflow linting, dependency update policy.
8. Historical friction when evidence is available and its inspection is in
   scope: accepted review findings, recurring CI failures, corrective follow-up
   changes, repeated handoff notes, agent-session corrections, command misuse,
   abandoned approaches, and unexpectedly slow tasks.

Prefer `rg` and existing project commands. Do not assume missing docs are the
main problem; missing executable feedback often matters more.

Use `references/harness-checklist.md` for audits or broad harness work. Treat
each baseline item as pass, gap, or not applicable, with file or command
evidence. For common ecosystems, formatter, linter, type/schema checks, tests,
and CI workflow checks are expected unless the project has a documented reason
to omit them. If applicable fast canonical checks exist, treat absent
commit-time feedback as a gap unless the audit gives a concrete reason it is not
useful. In audit mode, recommend `add` only when such a check already exists in
the current repository and a representative warm run fits the hook budget.
Otherwise record `n/a` as the current decision with the condition for
reconsidering it, even when the same audit recommends creating or measuring the
check. Read `references/tooling-patterns.md` and
`references/tooling-hooks-dependencies.md` when evaluating that decision.

When creating, auditing, or refining project instructions, read
`references/project-instructions.md` and `references/repo-knowledge-map.md`.
Inspect before interviewing the user. Ask only targeted questions about tacit
facts that materially change the result and cannot be established from project
evidence.

When authoring or revising agent-consumed guidance, read
`references/agent-authoring.md`. For a skill, also use the environment's
skill-authoring workflow; that workflow owns packaging and platform mechanics,
while this reference owns behavioral design, routing, and scenario checks.

### 3. Find the Missing Harness Capability

Translate every friction point into a missing guide, sensor, enforcement point,
task, or cleanup loop before choosing the artifact.

For each recurring failure or desired autonomy level, ask:

- **Can the agent find the right context?** If not, improve maps and indexes.
- **Can the agent validate the outcome?** If not, add commands, tests, fixtures,
  browser flows, logs, or observability entry points.
- **Does each sensor run at the earliest sound point?** If not, place it in the
  targeted, pre-commit, handoff, CI, or scheduled loop where it gives useful
  feedback without becoming slow or unsound.
- **Who owns each piece of evidence?** Avoid rerunning the same broad check at
  multiple tiers unless the later tier supplies materially different coverage.
- **Can the agent avoid forbidden designs?** If not, encode boundaries as tests
  or lints instead of prose.
- **Can the agent run the obvious command?** If not, standardize task names or
  wrap existing Make, Rake, package, or framework commands.
- **Can the agent prove format, lint, test, and workflow safety locally?** If
  not, add a command or document why the check is CI-only or not applicable.
- **Can the repo resist rushed dependency intake?** If not, recommend cooldowns,
  pinned automation dependencies, and lockfile checks.
- **Can the agent recover from drift?** If not, create cleanup checks, quality
  docs, or recurring maintenance prompts.
- **Is this rule stable enough to document?** If not, leave it as task-local
  guidance.

### 4. Choose the Right Artifact

Prefer durable repo-local artifacts:

- Concise root `AGENTS.md` as a map plus any compact project model,
  non-negotiables, vocabulary, impact dimensions, or hazards that materially
  affect most work.
- Deeper docs under `docs/` for architecture, product, testing, operations,
  quality, agent guidance, and execution plans.
- Project-local skills for procedural, conditional, or frequently reused agent
  workflows that should load only when triggered.
- Scripts for repeatable setup, reproduction, validation, and cleanup.
- Local hooks that invoke canonical project tasks instead of duplicating their
  commands.
- Tests or custom lints for rules that must not depend on attention.
- Diagnostic messages that explain how an agent should remediate the failure.
- Generated references when they can be refreshed mechanically.

Do not add large instruction blobs. Link to deeper sources and keep each source
owned, refreshable, and narrow.

Prefer `docs/agents/*.md` for detailed agent guidance. Add sub-folder
`AGENTS.md` files only when local rules differ sharply and should be
automatically loaded for edits in that subtree.

For Claude Code compatibility, ensure a root `CLAUDE.md` exists next to
`AGENTS.md` and contains only `@AGENTS.md`. If it contains unique guidance,
migrate the relevant content into `AGENTS.md` or linked docs before replacing
it.

For project-local skills, prefer `.agents/skills`. If that directory exists,
ensure `.claude/skills` is a symlink to `../.agents/skills` so Claude Code can
discover the same skills.

### 5. Output or Implement

For audits, output:

- current maturity level
- top harness gaps
- checklist highlights, especially missing automated validation
- prioritized changes by leverage and effort
- concrete files or checks to add
- an explicit `add`, `keep`, `change`, or `n/a` decision for local hooks; use
  `n/a` with a reconsideration condition when the decision is deferred
- a validation ladder naming each check's trigger, scope, approximate cost, and
  evidence owner
- validation strategy

When historical evidence is available, prioritize by observed frequency, failure
cost, and feedback delay as well as implementation and maintenance effort.
Separate broad sweeps into dependency-ordered, independently reviewable changes.

For project-instruction work, trace retained guidance to repository evidence or
explicit maintainer input. Scenario-check the result against representative
changes before calling it complete.

For implementation, keep the first pass narrow. Add one or two compounding
affordances, run relevant formatting/tests, and document any surprising
project-specific discovery in the project agent instructions.

Respect local validation guidance. Use targeted tests and checks for narrow
changes. Use full `verify`-style runs only when the change is broad, risky, or
near handoff and local instructions do not discourage full-suite runs.

## Reference Files

Read only what the current task needs:

- `references/harness-checklist.md`: concrete pass/gap/not-applicable audit
  checklist.
- `references/readiness-rubric.md`: audit categories and maturity levels.
- `references/repo-knowledge-map.md`: progressive disclosure structures.
- `references/project-instructions.md`: evidence-led discovery, targeted
  maintainer questions, content selection, and scenario checks for repo-specific
  `AGENTS.md` files.
- `references/agent-authoring.md`: behavioral design, routing, context control,
  source-of-truth discipline, and scenario checks for agent-consumed guidance.
- `references/enforceable-invariants.md`: turning taste and architecture into
  checks.
- `references/feedback-loops.md`: validation ownership, observability, and
  recovery loops.
- `references/entropy-cleanup.md`: recurring drift detection and cleanup.
- `references/guides-and-sensors.md`: feed-forward guides, feedback sensors, and
  computational vs inferential controls.
- `references/tooling-patterns.md`: standard task surfaces, hooks, supply-chain
  hardening, workflow checks, and optional GitNexus use.
- `references/tooling-snippets.md`: index for copyable tooling snippets.
- `references/tooling-task-surface.md`: `mise` task and version-file snippets.
- `references/tooling-github-actions.md`: GitHub Actions validation snippets.
- `references/tooling-gitnexus.md`: GitNexus installation snippets.
- `references/tooling-hooks-dependencies.md`: hook and dependency policy
  snippets.
- `references/tooling-language-checks.md`: language-specific validation
  snippets.

## Guardrails

- Favor executable checks over advisory prose when correctness or architecture
  matters.
- Treat missing formatters, linters, type/schema checks, test commands, and
  GitHub Actions checks as gaps unless they are genuinely not applicable.
- Do not add heavyweight tooling just to satisfy the checklist. Add the lightest
  durable control that gives agents reliable feedback for the repo's actual
  risk.
- Favor maps over manuals: short entry points, linked deeper sources.
- Keep guidance stable and grep-able; avoid brittle file path inventories.
- Wrap existing project tooling instead of replacing it. If `make`, `rake`,
  package scripts, or framework commands already exist, expose them through a
  standard task surface when useful.
- Treat supply-chain hardening as a default audit category.
- Recommend GitNexus only when codebase size, unfamiliarity, impact analysis, or
  repeated navigation failures justify it; do not install or index it unless the
  user asks.
- Preserve existing project conventions unless they block agent legibility.
- Do not introduce dependencies for simple scripts or checks.
- Treat external chat/docs/tacit knowledge as invisible until encoded in repo.
- When changing plugin commands or agent docs, update matching snippets or
  generated references required by the project.
