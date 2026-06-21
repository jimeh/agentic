---
name: harness-engineering
description: >-
  Audit, design, and incrementally improve repositories so coding agents can
  work reliably through legible project knowledge, runnable feedback loops,
  enforceable architecture rules, and cleanup processes. Use when asked to make
  a project suitable for harness engineering, improve agent autonomy, create an
  agent-ready repo structure, audit agent readiness, encode architecture or
  taste rules into checks, improve AGENTS.md/docs beyond instruction-file
  cleanup, or turn repeated agent failures into durable repo-local tooling and
  documentation.
---

# Harness Engineering

## Overview

Shape a repository into a practical agent harness: easy to navigate, easy to
validate, hard to drift, and explicit about the constraints agents must obey.
Optimize for repo-local systems that compound across future agent runs.

Harness engineering is not prompt polishing. Treat repeated agent mistakes as
missing harness capabilities: unclear maps, inaccessible signals, weak tests,
unenforced boundaries, stale docs, or absent cleanup loops.

Think in four parts:

- **Guides**: docs, skills, task names, examples, templates, and maps that steer
  agents before they act.
- **Sensors**: tests, linters, type checks, logs, CI, screenshots, review
  agents, and other feedback that lets agents self-correct after they act.
- **Task surface**: stable commands agents can discover and run without
  guessing.
- **Cleanup**: recurring checks and small refactors that keep the harness fresh.

## Workflow

### 1. Classify the Request

Pick the smallest useful mode:

- **Audit**: assess current readiness and propose prioritized changes.
- **Bootstrap**: create initial docs, scripts, checks, or harness conventions.
- **Refactor knowledge**: turn scattered instructions into progressive
  disclosure.
- **Encode rules**: convert recurring review feedback into mechanical checks.
- **Build feedback loops**: make app state, tests, logs, screenshots, or CI
  failures directly inspectable by agents.
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

### 2. Read the Project as the Agent Will

Inspect, in this order:

1. Root instructions: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`,
   `.github/copilot-instructions.md`.
2. Setup and validation: `README.md`, `Makefile`, package scripts, task runners,
   CI workflows, test configs.
3. Architecture and product docs: `docs/`, `ARCHITECTURE.md`, design docs, ADRs,
   schemas, generated references.
4. Agent affordances: browser automation, local dev boot scripts, local skills,
   log access, fixtures, seed data, screenshots, traces, PR/CI tooling.
5. Mechanical constraints: linters, dependency rules, type checks, structural
   tests, naming checks, file size checks, custom diagnostics.
6. Supply-chain controls: lockfiles, package-manager age gates, GitHub Actions
   pins, action/workflow linting, dependency update policy.

Prefer `rg` and existing project commands. Do not assume missing docs are the
main problem; missing executable feedback often matters more.

Use `references/harness-checklist.md` for audits or broad harness work. Treat
each baseline item as pass, gap, or not applicable, with file or command
evidence. For common ecosystems, formatter, linter, type/schema checks, tests,
and CI workflow checks are expected unless the project has a documented reason
to omit them.

### 3. Find the Missing Harness Capability

For each recurring failure or desired autonomy level, ask:

- **Can the agent find the right context?** If not, improve maps and indexes.
- **Can the agent validate the outcome?** If not, add commands, tests, fixtures,
  browser flows, logs, or observability entry points.
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

- Minimal root `AGENTS.md` as a map, not an encyclopedia.
- Deeper docs under `docs/` for architecture, product, testing, operations,
  quality, agent guidance, and execution plans.
- Project-local skills for procedural, conditional, or frequently reused agent
  workflows that should load only when triggered.
- Scripts for repeatable setup, reproduction, validation, and cleanup.
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
- validation strategy

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
- `references/enforceable-invariants.md`: turning taste and architecture into
  checks.
- `references/feedback-loops.md`: validation, observability, and recovery loops.
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
- Favor maps over manuals: short entry points, linked deeper sources.
- Keep guidance stable and grep-able; avoid brittle file path inventories.
- Wrap existing project tooling instead of replacing it. If `make`, `rake`,
  package scripts, or framework commands already exist, expose them through a
  standard task surface when useful.
- Use fast staged-file pre-commit hooks when helpful. Do not add pre-push hooks
  by default; leave longer checks to explicit agent runs or CI.
- Treat supply-chain hardening as a default audit category.
- Recommend GitNexus only when codebase size, unfamiliarity, impact analysis, or
  repeated navigation failures justify it; do not install or index it unless the
  user asks.
- Preserve existing project conventions unless they block agent legibility.
- Do not introduce dependencies for simple scripts or checks.
- Treat external chat/docs/tacit knowledge as invisible until encoded in repo.
- When changing plugin commands or agent docs, update matching snippets or
  generated references required by the project.
