# Repo Knowledge Map

Use this when shaping project docs for agent legibility.

## Principle

The root instruction file should be a map. It should tell agents what the repo
is, how to validate work, and where deeper truth lives. It should not be the
whole manual.

## Useful Structure

```text
AGENTS.md
ARCHITECTURE.md
docs/
  agents/
    TESTING.md
    OPERATIONS.md
    STYLE.md
  architecture/
    index.md
    decisions/
  product/
    index.md
  exec-plans/
    active/
    completed/
  generated/
```

Adapt the shape to the project. Do not create empty directories unless the next
task will use them.

## Root AGENTS.md Contents

Keep root instructions focused on:

- one-sentence project purpose
- unusual setup, package manager, or task runner facts
- canonical validation commands
- links to deeper docs
- non-obvious global rules that apply to all edits
- discovery hints for major domains or packages

Avoid:

- copied README content
- long style guides
- exhaustive directory trees
- fragile file path inventories
- rules that are already enforced by tools
- vague quality advice

## Deeper Docs

Create deeper docs only when they answer questions agents repeatedly need:

- **Architecture**: layers, boundaries, dependency direction, data flow.
- **Product**: domain vocabulary, user roles, business rules, workflows.
- **Testing**: test types, fixtures, targeted commands, flake policy.
- **Operations**: local services, logs, metrics, release/deploy notes.
- **Quality**: known gaps, cleanup priorities, standards not yet enforced.
- **Execution plans**: long-running work with progress and decision logs.

## Freshness

When docs can drift, add one of:

- a generation command
- a CI freshness check
- a short "last verified by" note
- a narrow owner or source of truth
- a recurring cleanup task

Do not add freshness metadata if nobody will maintain it.
