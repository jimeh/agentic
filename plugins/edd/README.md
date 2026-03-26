# edd

Eval-Driven Development: an evals-first workflow for building features with
coding agents. Define what "done" looks like before writing any code, let the
agent derive specs and implementation plans from those definitions, then
implement and verify against them.

## Philosophy

When you define rigid success criteria first and let the agent derive the
product spec and implementation plan from those criteria, the agent produces
significantly better code than when you hand it a detailed spec directly.

## Workflow

1. **Evals** — Define acceptance criteria, test cases, constraints, and edge
   cases
2. **Spec** — The agent reads the evals and writes a product spec and
   implementation plan
3. **Implement** — The agent implements the feature to satisfy the evals
4. **Verify** — An independent agent runs all evals/tests and confirms the
   feature works

## Commands

### `/edd-init`

Bootstrap the EDD system into the current repo. Creates directory structure,
feature index, and evals template.

### `/edd-embed`

Copy EDD commands, agents, and skill into the local project for portability and
use with non-Claude agents.

### `/edd-new <description>`

Create a new feature with scaffolded evals. Optionally spawns an adversarial
requirements reviewer.

### `/edd-spec <number>`

Freeze evals and generate a product spec and task list from a clean agent
context.

### `/edd-impl <number>`

Implement a feature from its spec using parallel sub-agents where possible.

### `/edd-verify <number> [URL]`

Verify implementation against evals with a strict, independent QA agent.

### `/edd-status`

Show feature index with status summary.

### `/edd-close <number> [complete|deferred|dropped]`

Archive a completed, deferred, or dropped feature.

## Install

```bash
claude plugin install edd@jimeh-agentic
```
