---
description: Create a new EDD feature with scaffolded evals
allowed-tools: Read, Write, Glob, Grep, LS, Bash(cat:*), Task
argument-hint: <feature description or idea>
---

## Context

- Feature index:
  !`cat docs/features/FEATURE_INDEX.md 2>/dev/null || echo "No EDD system found. Run /edd-init first."`
- Template: !`cat docs/features/TEMPLATE.md 2>/dev/null || echo "Not found"`

## Your Task

Create a new EDD feature with scaffolded acceptance criteria.

**Arguments:** `$ARGUMENTS`

### Step 1: Validate

If `docs/features/FEATURE_INDEX.md` doesn't exist, tell the user to run
`/edd-init` first and stop.

### Step 2: Determine Feature Number

Read the feature index to find the highest existing feature number. The new
feature gets the next number, zero-padded to 3 digits (e.g., 001, 002, 014).

### Step 3: Create Feature Directory

Derive a kebab-case short description from the user's arguments. Create:

```
docs/features/NNN-short-desc/
```

Keep the short description to 3-5 words max.

### Step 4: Scaffold evals.md

Copy the template from `docs/features/TEMPLATE.md` into the new feature
directory as `evals.md`. Pre-populate it with context from the user's
description:

- Replace `NNN` with the actual feature number
- Replace `[Title]` with a title derived from the description
- Fill in the Problem section with the user's description
- Add any acceptance criteria that are obvious from the description
- Leave the rest as template placeholders for the user to fill in

### Step 5: Update Feature Index

Add a row to the Active section of `docs/features/FEATURE_INDEX.md`:

```
| NNN | [Feature title] | Draft | [today's date] | [today's date] |
```

### Step 6: Brainstorm (Optional)

Ask the user: "Want me to run the eval-brainstormer to suggest edge cases and
failure modes?"

If yes, spawn the **eval-brainstormer** sub-agent via the Task tool with:

- The problem statement from the user's description
- A summary of the project's codebase structure (languages, frameworks, key
  directories — gather this by reading CLAUDE.md/AGENTS.md and listing top-level
  directories)
- The current draft of evals.md

Present the brainstormer's suggestions to the user. The user decides which to
incorporate into evals.md.

### Step 7: Report

Tell the user:

- Feature NNN created at `docs/features/NNN-short-desc/`
- `evals.md` is scaffolded at the path
- Brainstormer suggestions (if run) are ready to review
- **During Draft, evals.md is freely editable.** The user can:
  - Edit it directly
  - Ask the agent to add criteria, edge cases, or test cases
  - Re-run the brainstormer for more suggestions
- When the evals are solid, run `/edd-spec NNN` to freeze them and generate the
  spec
