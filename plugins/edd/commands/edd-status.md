---
description: Show EDD feature index with status summary and actionable prompts
allowed-tools: Read, Glob, Grep, LS
argument-hint: ""
---

## Context

- Feature index:
  !`cat docs/features/FEATURE_INDEX.md 2>/dev/null || echo "No EDD system found. Run /edd-init first."`

## Your Task

Display the current state of all EDD features with a summary and actionable
prompts.

### Step 1: Read the Index

Read `docs/features/FEATURE_INDEX.md`. If it doesn't exist, tell the user to run
`/edd-init` first and stop.

### Step 2: Verify Status Consistency

For each active feature in the index, check the feature directory to verify the
status is consistent:

- "Draft" — `evals.md` should exist, `spec.md` should not
- "Evals Ready" — `evals.md` exists, no spec yet
- "Specced" — `evals.md` and `spec.md` exist
- "In Progress" — `tasks.md` should have some checked items
- "Verifying" — `verification.md` may exist
- "Done" — `verification.md` should exist with all PASS

Flag any inconsistencies.

### Step 3: Display Summary

Show:

1. The full feature index table
2. A summary: how many features in each stage
3. Actionable prompts:
   - Features in "Draft" → "Finish evals and run `/edd-spec NNN`"
   - Features in "Specced" → "Ready for implementation: `/edd-impl NNN`"
   - Features in "Verifying" → "Check verification: `/edd-verify NNN`"
   - Features in "In Progress" → "Resume: `/edd-impl NNN`"
