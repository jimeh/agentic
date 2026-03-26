---
description: Bootstrap the EDD (Eval-Driven Development) system into the current repo
allowed-tools: Read, Write, Glob, Grep, LS, Bash(mkdir:*), Bash(git log:*)
argument-hint: <optional project description>
---

## Context

- Agent instructions:
  !`cat CLAUDE.md 2>/dev/null || cat AGENTS.md 2>/dev/null || echo "None found"`
- Existing EDD:
  !`ls docs/features/FEATURE_INDEX.md 2>/dev/null || echo "Not found"`
- Project files:
  !`ls package.json pyproject.toml Cargo.toml go.mod 2>/dev/null || echo "None found"`

## Your Task

Bootstrap the EDD system into the current repo.

**Arguments:** `$ARGUMENTS`

### Before Starting

1. Check if `docs/features/FEATURE_INDEX.md` already exists
   - If it does, report what's already set up and ask what to regenerate
   - If not, proceed with full setup
2. Identify the project root — this is the current working directory

### Step 1: Infer Project Context

Gather context to make the EDD system project-aware:

1. Read `CLAUDE.md` or `AGENTS.md` if they exist — note conventions, commit
   style, project name
2. Check `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or similar
   for project metadata
3. Look at recent git log for commit message style
4. Note the primary language and existing docs structure

### Step 2: Create Directory Structure

```bash
mkdir -p docs/features
```

### Step 3: Create FEATURE_INDEX.md

Create `docs/features/FEATURE_INDEX.md`:

```markdown
# Feature Index

## Active

| # | Feature | Status | Created | Updated |
|---|---------|--------|---------|---------|

## Completed

| # | Feature | Completed | Notes |
|---|---------|-----------|-------|

## Dropped / Deferred

| # | Feature | Status | Reason |
|---|---------|--------|--------|
```

### Step 4: Create TEMPLATE.md

Create `docs/features/TEMPLATE.md` with this evals template:

```markdown
# Feature NNN: [Title]

## Problem

What problem does this solve? Who is it for? Why does it matter?

## Acceptance Criteria

Concrete, verifiable criteria for "this feature is done":

- [ ] ...

## Test Cases

Specific scenarios that must work. Be concrete about inputs and expected
outputs.

### Happy Path

1. Given [setup], when [action], then [expected result]

### Edge Cases

1. Given [unusual input], then [expected behavior]

### Error Cases

1. Given [bad input], then [expected error handling]

## Constraints

Technical or design constraints the implementation must respect:

- ...

## Out of Scope

Things this feature explicitly does NOT do (prevents over-building):

- ...
```

### Step 5: Update Agent Instructions

Append EDD conventions to the project's CLAUDE.md (or AGENTS.md if that's what
the project uses). If neither exists, create a CLAUDE.md.

Add a section like:

```markdown
## EDD Conventions

- When asked to implement a feature, check `docs/features/` for an EDD feature
  directory first
- Reference EDD feature numbers in commit messages (adapt to the project's
  commit style)
- Never modify `evals.md` when the feature status is Evals Ready or later
- When writing specs from evals, use your own language — don't just reformat the
  evals
```

Adapt the conventions to the project's existing style and commit format.

### Step 6: Report

Tell the user:

- The EDD system is ready
- `docs/features/FEATURE_INDEX.md` and `TEMPLATE.md` were created
- Conventions were added to CLAUDE.md/AGENTS.md
- Next step: `/edd-new <description>` to create a feature
- For portability (non-Claude agents, local commands): `/edd-embed`
