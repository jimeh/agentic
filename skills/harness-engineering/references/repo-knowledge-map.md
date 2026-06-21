# Repo Knowledge Map

Use this when shaping project docs for agent legibility.

## Contents

- [Principle](#principle)
- [Useful Structure](#useful-structure)
- [Claude Code Compatibility](#claude-code-compatibility)
- [Root AGENTS.md Contents](#root-agentsmd-contents)
- [Deeper Docs](#deeper-docs)
- [Project-Local Skills](#project-local-skills)
- [Sub-Folder AGENTS.md](#sub-folder-agentsmd)
- [Freshness](#freshness)

## Principle

The root instruction file should be a map. It should tell agents what the repo
is, how to validate work, and where deeper truth lives. It should not be the
whole manual.

## Useful Structure

```text
AGENTS.md
CLAUDE.md
ARCHITECTURE.md
.agents/
  skills/
.claude/
  skills -> ../.agents/skills
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

Prefer `docs/agents/*.md` for detailed agent guidance. Use sub-folder
`AGENTS.md` files only when a subtree has short, stable, materially different
rules that should be auto-loaded for edits there.

If an agent guide becomes procedural, conditional, or frequently reused,
consider promoting it to a project-local skill instead of growing more docs.

## Claude Code Compatibility

Use `AGENTS.md` as the shared source of truth. Since Claude Code does not read
`AGENTS.md` by default, ensure the project root also has a `CLAUDE.md` file next
to it containing exactly:

```markdown
@AGENTS.md
```

If `CLAUDE.md` already contains unique project guidance, migrate the still-valid
parts into `AGENTS.md` or linked docs before replacing it with the thin
reference.

## Root AGENTS.md Contents

Keep root instructions focused on:

- one-sentence project purpose
- unusual setup, package manager, or task runner facts
- canonical task and validation commands
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

- **Agent workflows**: task surface, validation tiers, hooks, CI mapping.
- **Architecture**: layers, boundaries, dependency direction, data flow.
- **Product**: domain vocabulary, user roles, business rules, workflows.
- **Testing**: test types, fixtures, targeted commands, flake policy.
- **Operations**: local services, logs, metrics, release/deploy notes.
- **Quality**: known gaps, cleanup priorities, standards not yet enforced.
- **Execution plans**: long-running work with progress and decision logs.

## Project-Local Skills

Recommend a project-local skill when a guide becomes a reusable workflow rather
than reference material.

Good candidates:

- release preparation with version, changelog, CI, and publication steps
- migrations with widen-migrate-narrow phases and validation commands
- PR feedback triage with review-thread inspection and stale-comment handling
- benchmark or performance workflows with repeatable setup and proof artifacts
- incident or debugging workflows with logs, traces, fixtures, and teardown
- long-running feature work with planner, implementer, evaluator, and handoff
  artifacts

Keep background knowledge in `references/` inside the skill. Move deterministic
repeatable code into `scripts/`. Leave stable architecture, domain vocabulary,
and simple command lists as docs.

Store project-local skills under `.agents/skills`. Whenever local skills exist,
create `.claude/skills` as a symlink to `../.agents/skills`.

## Sub-Folder AGENTS.md

Create sub-folder instruction files sparingly. Good reasons:

- different language, runtime, package manager, or framework
- local generated-code or migration rules
- local security or deployment boundary
- local validation commands that agents must always see

Bad reasons:

- documenting every package in a monorepo
- copying root commands with minor wording changes
- replacing docs that agents could open when relevant
- encoding file path inventories that will drift

## Freshness

When docs can drift, add one of:

- a generation command
- a CI freshness check
- a short "last verified by" note
- a narrow owner or source of truth
- a recurring cleanup task

Do not add freshness metadata if nobody will maintain it.
