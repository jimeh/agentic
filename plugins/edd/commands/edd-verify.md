---
description: Verify implementation against evals with a strict, independent QA agent
allowed-tools: Read, Write, Glob, Grep, LS, Task, Bash(npm:*), Bash(npx:*), Bash(pnpm:*), Bash(yarn:*), Bash(cargo:*), Bash(go:*), Bash(python:*), Bash(pytest:*), Bash(make:*)
argument-hint: <feature number> [optional URL]
---

## Context

- Feature index:
  !`cat docs/features/FEATURE_INDEX.md 2>/dev/null || echo "No EDD system found."`

## Your Task

Verify a feature's implementation against its evals using an independent,
skeptical QA agent that has never seen the spec or task list.

**Arguments:** `$ARGUMENTS`

### Step 1: Parse Arguments

Extract:

- Feature number (required)
- URL (optional) — where the application is running for browser testing

### Step 2: Find the Feature

Find the feature directory: `docs/features/NNN-*/`.

### Step 3: Validate Status

The feature should be in "In Progress", "Verifying", or "Done" status. Other
statuses suggest implementation hasn't started yet.

### Step 4: Determine Test Runner

Identify how to run the project's test suite by checking:

- `package.json` for `test` script (npm/pnpm/yarn)
- `Cargo.toml` for Rust (cargo test)
- `go.mod` for Go (go test)
- `pyproject.toml` or `setup.py` for Python (pytest)
- `Makefile` for custom test targets
- CLAUDE.md/AGENTS.md for documented test commands

### Step 5: Spawn Verifier

Spawn the **verifier** sub-agent via the Task tool with:

1. **The feature's `evals.md`** — the full acceptance contract
2. **Source code context** — identify relevant source files from the evals and
   pass their paths
3. **Test runner info** — how to run the project's test suite
4. **URL** (if provided) — for browser-based verification
5. **Output path** — write results to `verification.md` in the feature directory

**Critical:** Do NOT pass `spec.md` or `tasks.md` to the verifier. It must
verify against the evals only.

If the Task tool is not available, read the verifier agent instructions from
`${CLAUDE_PLUGIN_ROOT}/agents/verifier.md` and follow them yourself.

### Step 6: Process Results

After the verifier completes, read `verification.md` and determine the outcome:

- **All PASS:** Update status to "Done" in `FEATURE_INDEX.md`. Tell the user the
  feature is verified and ready for `/edd-close NNN complete`.
- **Any FAIL:** Keep status as "Verifying". Present the failures with:
  - Which criteria failed
  - What's wrong
  - Suggested fixes
  - Ask if the user wants to fix the issues and re-verify
- **Any NEEDS REVIEW:** Present these for the user to make a judgment call.

### Step 7: Report

Summarize:

- Total criteria checked
- Pass / Fail / Needs Review counts
- Critical failures (if any)
- Next steps
