# Repo Knowledge Map

Use this when shaping project docs for agent legibility.

## Contents

- [Principle](#principle)
- [Useful Structure](#useful-structure)
- [Claude Code Compatibility](#claude-code-compatibility)
- [Root AGENTS.md Contents](#root-agentsmd-contents)
- [Deeper Docs](#deeper-docs)
- [Artifact lifetime](#artifact-lifetime)
- [Project-Local Skills](#project-local-skills)
- [Sub-Folder AGENTS.md](#sub-folder-agentsmd)
- [Freshness](#freshness)

## Principle

The root instruction file should be a map with enough compact, decision-shaping
context to guide every change. It should tell agents what the repo is, how to
validate work, what must not be compromised, and where deeper truth lives. It
should not be the whole manual.

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

Use [Project Instructions](./project-instructions.md#choose-the-content) as the
source of truth for selecting and pruning root content. This map only adds the
placement rule: keep enough compact, project-wide context in the root file to
shape every change, then link conditional detail or place materially different
rules closer to their subtree.

## Deeper Docs

Create deeper docs only when they answer questions agents repeatedly need:

- **Agent workflows**: task surface, validation tiers, hooks, CI mapping.
- **Architecture**: layers, boundaries, dependency direction, data flow.
- **Product**: domain vocabulary, user roles, business rules, workflows.
- **Testing**: test types, fixtures, targeted commands, flake policy.
- **Operations**: local services, logs, metrics, release/deploy notes.
- **Quality and plans**: only when the repository is their maintained source of
  truth, using the lifetime decision below.

## Artifact lifetime

Before creating a tracker, plan, or reference, identify its audience,
authoritative source, maintenance trigger, and useful lifetime. Reuse the
project's maintained issue or planning system rather than duplicating pending
work in Markdown. Committed plans are appropriate when the project maintains
them and distinguishes proposals, active requirements, and historical decisions.

Keep durable reasons, cross-component decisions, and traps that source alone
does not explain. Link to inspectable configuration or generated references
instead of copying facts that change frequently. External knowledge should be
discoverable, but need not be copied into the repository when an accessible,
version-appropriate source already serves the task.

Review search results and examples as agent input. Retire superseded commands,
stale plans, and misleading examples within the authorized scope. Preserve
valuable historical decisions with explicit status and links to their
replacements; merely moving stale instructions to an archive may leave them in
ordinary search. Keep temporary research and PR-only media in the project's
chosen artifact location, with a retention or disposal boundary.

Test the result with a representative query: can a fresh reader distinguish
current behavior, planned work, and history without reconstructing the timeline?

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
