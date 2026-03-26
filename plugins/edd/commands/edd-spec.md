---
description: Freeze evals and generate (or refine) product spec + task list
allowed-tools: Read, Write, Glob, Grep, LS, Bash(cat:*), Task
argument-hint: "<feature number> [optional feedback for refinement]"
---

## Context

- Feature index:
  !`cat docs/features/FEATURE_INDEX.md 2>/dev/null || echo "No EDD system found."`
- Agent instructions:
  !`cat CLAUDE.md 2>/dev/null || cat AGENTS.md 2>/dev/null || echo "None found"`

## Your Task

Freeze a feature's evals and generate a product spec and implementation task
list — or refine an existing spec based on user feedback.

**Arguments:** `$ARGUMENTS`

The first token is the feature number. Any remaining text is feedback for
refining an existing spec (e.g. `/edd-spec 3 split task 4 into smaller steps`).

### Step 1: Find the Feature

Parse the feature number from the first token of arguments (accept both `14` and
`014`). Capture any remaining text as **argument feedback**. Find the feature
directory: `docs/features/NNN-*/`.

If not found, report the error and stop.

### Step 2: Validate Status

Read the feature's current status from `FEATURE_INDEX.md`.

- **Draft** — proceed (will freeze evals in Step 3).
- **Evals Ready** or **Specced** — evals are already frozen, proceed directly to
  Step 4 (skip Step 3).
- **In Progress** or later — stop. Tell the user: "This feature is already being
  implemented. To change the spec, first revert the status back to Specced (or
  Draft if evals need changes too), then re-run `/edd-spec`."

### Step 3: Freeze Evals (Draft only)

Only run this step if the current status is **Draft**.

Update the feature's status in `FEATURE_INDEX.md` from "Draft" to "Evals Ready".
Update the "Updated" date.

From this point forward, `evals.md` is frozen. It must NOT be modified.

### Step 4: Detect Mode and Spawn Spec-Writer

Check whether `spec.md` and `tasks.md` already exist in the feature directory.

#### Fresh generation (files don't exist)

Spawn the **spec-writer** sub-agent via the Task tool with a clean context
containing:

1. **The feature's `evals.md`** — read the full contents and pass them to the
   agent
2. **Project context** — the project's CLAUDE.md or AGENTS.md
3. **Codebase context** — identify relevant source files by reading the evals
   and determining which parts of the codebase are involved. Pass file paths and
   key patterns to the agent.
4. **Instructions** — tell the agent to:
   - Write `spec.md` in the feature directory
   - Write `tasks.md` in the feature directory
   - Follow the spec-writer agent instructions
   - This is a fresh generation — no prior spec exists

#### Refinement (files already exist)

Gather feedback from two sources:

1. **Argument feedback** — any text from `$ARGUMENTS` beyond the feature number
2. **Inline notes** — scan `spec.md` and `tasks.md` for user annotations: HTML
   comments (`<!-- ... -->`), lines starting with `>` (blockquotes), markers
   like `NOTE:`, `TODO:`, `FIXME:`, `Q:`, or any text that reads as
   critique/feedback rather than spec content. Extract these as refinement
   context.

If **neither source has feedback** (files exist but no annotations and no
argument text), ask the user: "spec.md and tasks.md already exist with no inline
notes. Want to regenerate from scratch, or add feedback first? You can either
add notes directly in the files or re-run with:
`/edd-spec NNN your feedback here`"

If feedback was found, spawn the **spec-writer** sub-agent with:

1. **The feature's `evals.md`** — the acceptance contract (read-only)
2. **The existing `spec.md`** — current spec to refine
3. **The existing `tasks.md`** — current task list to refine
4. **Collected feedback** — argument feedback and/or extracted inline notes,
   clearly labeled by source
5. **Project context** — CLAUDE.md or AGENTS.md
6. **Instructions** — tell the agent to:
   - Refine (not rewrite) `spec.md` and `tasks.md` in the feature directory
   - Address all feedback points
   - Remove inline annotations after addressing them
   - Follow the spec-writer agent instructions (refinement mode)

If the Task tool is not available, follow the spec-writer agent's instructions
yourself. Read the agent definition at
`${CLAUDE_PLUGIN_ROOT}/agents/spec-writer.md` for guidance.

### Step 5: Update Status

After the spec-writer completes:

- If current status is "Evals Ready", advance to "Specced".
- If current status is already "Specced", leave it as "Specced".
- In either case, update the "Updated" date in `FEATURE_INDEX.md`.

Never move status backward.

### Step 6: Present for Review

Show the user:

1. A summary of `spec.md` — key decisions, data model changes, integration
   points
2. A summary of `tasks.md` — task count, which are parallelizable, estimated
   complexity
3. Any Questions/Assumptions the spec-writer flagged
4. If this was a refinement: a summary of what changed

**Next steps for the user:**

- To iterate further: add inline notes in `spec.md` or `tasks.md` and/or re-run
  `/edd-spec NNN <feedback>`
- When satisfied: `/edd-impl NNN` to start implementation
