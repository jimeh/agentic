---
name: Eval-Driven Development (EDD)
description: >-
  This skill should be used when the user asks to "build a new feature",
  "implement a feature", "write acceptance criteria", "write evals", "create a
  feature spec", "define what done looks like", "edd", "eval-driven
  development", "feature evals", "acceptance tests", "verify a feature", or
  when starting work on any non-trivial new feature. Guides the user through an
  evals-first workflow where acceptance criteria are defined before code, the
  agent derives specs from those criteria, implementation uses parallel
  sub-agents, and verification is done by an independent agent with fresh
  context.
---

# Eval-Driven Development (EDD)

A structured workflow for building features with coding agents. Define rigid
acceptance criteria first, let the agent derive the spec, implement against it,
then verify with fresh eyes.

## Philosophy

The core insight: when you define what "done" looks like before writing any code
and let the agent derive the product spec from those definitions, the agent
produces significantly better code than when you hand it a detailed spec
directly.

Three principles make this work:

1. **Evals first** — Acceptance criteria are the source of truth. Everything
   else (spec, implementation, tests) is derived from them.
2. **Context isolation** — Each phase uses a fresh agent context. The agent that
   writes the spec never saw the eval discussions. The agent that verifies never
   saw the spec. Communication between phases happens through files, not
   conversation history.
3. **Freeze rule** — Once evals are frozen, they become the immutable contract.
   Changing the goalposts requires explicit acknowledgment.

## Quick Start

1. `/edd-init` — Bootstrap EDD into the repo (once per project)
2. `/edd-new <description>` — Create a feature, scaffold evals
3. Edit `evals.md` until acceptance criteria are solid
4. `/edd-spec <number>` — Freeze evals, generate spec and tasks
5. Review spec and tasks, then `/edd-impl <number>` — Implement
6. `/edd-verify <number>` — Independent verification against evals
7. `/edd-close <number> complete` — Archive when done

## Directory Structure

EDD stores feature artifacts under `docs/features/`:

```
docs/features/
  FEATURE_INDEX.md          # Tracks all features and status
  TEMPLATE.md               # Evals template for new features
  NNN-short-desc/           # Per-feature directory
    evals.md                # Acceptance criteria (frozen after Draft)
    spec.md                 # Product spec (agent-generated)
    tasks.md                # Implementation tasks (agent-generated)
    verification.md         # Verification results (agent-generated)
    notes.md                # Optional: design decisions, alternatives
```

Feature numbers are zero-padded to 3 digits, auto-incrementing. Short
descriptions are kebab-case.

## Feature Lifecycle

| Stage           | Meaning                                            |
| --------------- | -------------------------------------------------- |
| **Draft**       | Evals being written — evals.md is open for editing |
| **Evals Ready** | Evals frozen — evals.md must not be modified       |
| **Specced**     | Spec and tasks generated from evals                |
| **In Progress** | Implementation underway                            |
| **Verifying**   | Implementation done, running verification          |
| **Done**        | Verified and complete                              |
| **Deferred**    | Postponed                                          |
| **Dropped**     | Cancelled                                          |

## The Evals Freeze Rule

`evals.md` is freely editable during **Draft**. The user can write it by hand,
dictate it to an agent, or collaborate with an agent to refine it. But once the
feature transitions to **Evals Ready** (via `/edd-spec`), `evals.md` is frozen.
It must not be modified from this point forward.

If the evals need to change (scope changed, something was missed), the user must
explicitly revert the feature status back to Draft. This is intentional friction
— it forces conscious acknowledgment that the goalposts have moved. After
reverting, spec.md and tasks.md should be regenerated.

## Commands

| Command                     | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `/edd-init`                 | Bootstrap EDD into the repo              |
| `/edd-embed`                | Copy commands/agents/skill locally       |
| `/edd-new <desc>`           | Create a new feature with evals scaffold |
| `/edd-spec <num>`           | Freeze evals, generate spec + tasks      |
| `/edd-impl <num>`           | Implement from spec with sub-agents      |
| `/edd-verify <num> [URL]`   | Independent QA against evals             |
| `/edd-status`               | Show feature index and status            |
| `/edd-close <num> [status]` | Archive a feature                        |

## Agents

EDD uses sub-agents with clean context windows. Each agent receives only what it
needs.

**eval-brainstormer** — Adversarial requirements reviewer. Receives the problem
statement and codebase summary. Suggests edge cases, error scenarios, and
constraints the user might have missed. Does NOT receive implementation details
or source code.

**spec-writer** — Derives spec and tasks from frozen evals. Receives evals.md
and codebase context. Produces spec.md in its own voice (not reformatted evals)
and tasks.md with dependency and parallelization annotations. Does NOT receive
Draft-phase conversation history.

**implementer** — Implements a single task or batch. Receives evals.md
(read-only), spec.md, and only its assigned tasks. Writes permanent tests and
makes atomic commits. Does NOT receive the full task list or other agents'
output.

**verifier** — Strict QA against evals. Receives evals.md and source code only.
Explicit PASS/FAIL per criterion. Does NOT receive spec.md or tasks.md — it
verifies against the evals, not the plan.

## Context Isolation

Context isolation between phases is load-bearing, not optional polish:

- An agent that helped debate evals during Draft carries implicit assumptions
  into spec writing. A fresh agent reading only the frozen evals produces a
  cleaner spec.
- An agent that wrote the code cannot objectively verify it. A fresh agent with
  only evals and source code can.
- An agent grinding through 8 tasks accumulates context noise. Individual agents
  with scoped tasks produce cleaner implementations.

Communication between phases happens through the feature directory files
(evals.md, spec.md, tasks.md, verification.md), not conversation history.

## Parallel Implementation

During `/edd-impl`, tasks are analyzed for dependencies:

- **Independent tasks** run as parallel sub-agents, each with its own clean
  context
- **Dependent tasks** run sequentially after their prerequisites complete
- The orchestrating agent manages ordering and integration but does not do the
  implementation itself
- After each batch, the full test suite runs to catch integration issues

The task list (tasks.md) must explicitly mark dependencies and parallelizable
tasks so the orchestrator knows the execution graph.

## Graceful Degradation

If sub-agents are not available in the environment:

- Commands still work — the orchestrating agent follows the agent instructions
  itself
- Context isolation benefits are reduced but the workflow structure remains
- For implementation, use context resets between tasks where possible (finish a
  task, commit, clear context, start fresh)
- The SKILL.md serves as a reference for any coding agent to follow the workflow
  manually

## Commit Convention

EDD features reference their feature number in commit messages. The format
adapts to the project's existing convention:

- **Conventional commits:** `feat(scope): description (EDD-NNN)`
- **No convention detected:** `EDD-NNN: description`
- **Custom convention:** Follow the project's pattern, include `EDD-NNN`

The implementer infers the project's commit style from git log and
CLAUDE.md/AGENTS.md.

## Embedding for Portability

`/edd-embed` copies commands, agents, and the skill into the local project:

- Commands → `.claude/commands/`
- Skill + agents → `.agents/skills/edd/`
- Symlink: `.claude/skills/edd` → `../../.agents/skills/edd`

This makes EDD available without the plugin installed and accessible to
non-Claude agents that can read the skill and agent files directly.

## Further Reading

- See `references/eval-writing-guide.md` for how to write effective evals
- See `references/workflow.md` for the detailed step-by-step workflow
