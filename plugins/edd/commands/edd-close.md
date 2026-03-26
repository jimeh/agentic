---
description: Archive a completed, deferred, or dropped EDD feature
allowed-tools: Read, Write, Glob, Grep, LS
argument-hint: <feature number> [complete|deferred|dropped]
---

## Context

- Feature index:
  !`cat docs/features/FEATURE_INDEX.md 2>/dev/null || echo "No EDD system found."`

## Your Task

Archive an EDD feature by updating the feature index.

**Arguments:** `$ARGUMENTS`

### Step 1: Parse Arguments

Extract the feature number and disposition from the arguments. The disposition
defaults to "complete" if not specified.

- `complete` — Feature is done and verified
- `deferred` — Feature is postponed for later
- `dropped` — Feature is cancelled

### Step 2: Find the Feature

Look up the feature directory: `docs/features/NNN-*/` where NNN is the
zero-padded feature number. If not found, report the error and stop.

### Step 3: Validate Status

- For `complete`: the feature should be in "Done" or "Verifying" status. If it's
  in "Verifying", warn the user that verification may not be finished.
- For `deferred` or `dropped`: any status is acceptable.

### Step 4: Update FEATURE_INDEX.md

Move the feature from the Active section to the appropriate section:

- `complete` → Completed section
- `deferred` → Dropped / Deferred section (status: Deferred)
- `dropped` → Dropped / Deferred section (status: Dropped)

### Step 5: Verify Tests (for complete only)

If the disposition is `complete`, check that the implementation wrote test files
in the project's test directory. List the test files associated with this
feature (grep for the feature number or related test names).

Report: "Tests found in [paths]" or "No dedicated test files found — verify that
acceptance criteria are covered by existing tests."

### Step 6: Report

Summarize what was done:

- Feature number and title
- New status
- Where the feature sits in the index
