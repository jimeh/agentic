---
description: Refine and iterate on evals for a Draft-phase EDD feature
allowed-tools: Read, Write, Edit, Glob, Grep, LS, Bash(cat:*), Task
argument-hint: "<feature number> [feedback or instructions]"
---

## Context

- Feature index:
  !`cat docs/features/FEATURE_INDEX.md 2>/dev/null || echo "No EDD system found. Run /edd-init first."`

## Your Task

Help the user refine and strengthen the evals for a feature that is still in
Draft. This is the iterative loop between `/edd-new` and `/edd-spec`.

**Arguments:** `$ARGUMENTS`

The first token is the feature number. Any remaining text is feedback or
instructions for refinement (e.g.
`/edd-draft 3 add edge cases for concurrent access`).

### Step 1: Find the Feature

Parse the feature number from the first token (accept both `14` and `014`).
Capture remaining text as **user feedback**. Find the feature directory:
`docs/features/NNN-*/`.

If not found, report the error and stop.

### Step 2: Validate Status

Read the feature's current status from `FEATURE_INDEX.md`.

- **Draft** — proceed.
- **Any other status** — stop. Tell the user: "This feature is past Draft. Evals
  are frozen. To edit evals again, first revert the status back to Draft, then
  re-run `/edd-draft`."

### Step 3: Read Current Evals

Read the feature's `evals.md`. Understand what criteria, test cases, and
constraints already exist.

### Step 4: Determine Action

Based on the user feedback and the current state of evals.md, do one or more of
the following:

#### If user gave specific feedback

Apply the feedback directly — add criteria, refine wording, add test cases,
remove items, restructure sections, etc. Use the eval-writing guide principles:
be specific not vague, test inputs/outputs not implementation, cover unhappy
paths.

#### If user asked for brainstorming

Spawn the **eval-brainstormer** sub-agent via the Task tool with:

- The problem statement from evals.md
- A summary of the project's codebase (from CLAUDE.md/AGENTS.md and top-level
  directory listing)
- The current evals.md content

Present the brainstormer's suggestions. Ask the user which to incorporate, then
apply their selections to evals.md.

#### If user gave no specific feedback

Review the current evals.md and provide a brief assessment:

- What areas are well-covered
- What gaps you notice (missing edge cases, vague criteria, untested error
  paths)
- Suggest specific improvements

Ask the user what they'd like to work on, or offer to run the brainstormer.

### Step 5: Update and Report

After making changes to evals.md:

1. Update the "Updated" date in `FEATURE_INDEX.md`
2. Show the user a summary of what changed
3. Remind them of their options:
   - `/edd-draft NNN <feedback>` to continue refining
   - `/edd-draft NNN` for a gap assessment or brainstorming
   - `/edd-spec NNN` when evals are solid — to freeze and generate the spec
