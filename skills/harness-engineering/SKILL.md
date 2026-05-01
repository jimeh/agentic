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
- **Garbage collect**: find drift and create small cleanup work items.

If the user asks to "make changes", "bootstrap", "add", "fix", or similar,
implement the focused harness improvement. If they ask to "consider", "audit",
"plan", or "explore", return a plan before editing.

### 2. Read the Project as the Agent Will

Inspect, in this order:

1. Root instructions: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`,
   `.github/copilot-instructions.md`.
2. Setup and validation: `README.md`, `Makefile`, package scripts, task runners,
   CI workflows, test configs.
3. Architecture and product docs: `docs/`, `ARCHITECTURE.md`, design docs, ADRs,
   schemas, generated references.
4. Agent affordances: browser automation, local dev boot scripts, log access,
   fixtures, seed data, screenshots, traces, PR/CI tooling.
5. Mechanical constraints: linters, dependency rules, type checks, structural
   tests, naming checks, file size checks, custom diagnostics.

Prefer `rg` and existing project commands. Do not assume missing docs are the
main problem; missing executable feedback often matters more.

### 3. Find the Missing Harness Capability

For each recurring failure or desired autonomy level, ask:

- **Can the agent find the right context?** If not, improve maps and indexes.
- **Can the agent validate the outcome?** If not, add commands, tests, fixtures,
  browser flows, logs, or observability entry points.
- **Can the agent avoid forbidden designs?** If not, encode boundaries as tests
  or lints instead of prose.
- **Can the agent recover from drift?** If not, create cleanup checks, quality
  docs, or recurring maintenance prompts.
- **Is this rule stable enough to document?** If not, leave it as task-local
  guidance.

### 4. Choose the Right Artifact

Prefer durable repo-local artifacts:

- Minimal root `AGENTS.md` as a map, not an encyclopedia.
- Deeper docs under `docs/` for architecture, product, testing, operations,
  quality, and execution plans.
- Scripts for repeatable setup, reproduction, validation, and cleanup.
- Tests or custom lints for rules that must not depend on attention.
- Diagnostic messages that explain how an agent should remediate the failure.
- Generated references when they can be refreshed mechanically.

Do not add large instruction blobs. Link to deeper sources and keep each source
owned, refreshable, and narrow.

### 5. Output or Implement

For audits, output:

- current maturity level
- top harness gaps
- prioritized changes by leverage and effort
- concrete files or checks to add
- validation strategy

For implementation, keep the first pass narrow. Add one or two compounding
affordances, run relevant formatting/tests, and document any surprising
project-specific discovery in the project agent instructions.

## Reference Files

Read only what the current task needs:

- `references/readiness-rubric.md`: audit categories and maturity levels.
- `references/repo-knowledge-map.md`: progressive disclosure structures.
- `references/enforceable-invariants.md`: turning taste and architecture into
  checks.
- `references/feedback-loops.md`: validation, observability, and recovery loops.
- `references/entropy-cleanup.md`: recurring drift detection and cleanup.

## Guardrails

- Favor executable checks over advisory prose when correctness or architecture
  matters.
- Favor maps over manuals: short entry points, linked deeper sources.
- Keep guidance stable and grep-able; avoid brittle file path inventories.
- Preserve existing project conventions unless they block agent legibility.
- Do not introduce dependencies for simple scripts or checks.
- Treat external chat/docs/tacit knowledge as invisible until encoded in repo.
- When changing plugin commands or agent docs, update matching snippets or
  generated references required by the project.
