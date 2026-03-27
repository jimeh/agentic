---
description: Implement a feature from its spec using parallel sub-agents where possible
allowed-tools: Read, Write, Edit, Glob, Grep, LS, Bash(cat:*), Bash(git status:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git diff:*), Task, NotebookEdit
argument-hint: "[feature number]"
---

## Context

- Feature index:
  !`cat docs/features/FEATURE_INDEX.md 2>/dev/null || echo "No EDD system found."`
- Git status: !`git status --short`
- Recent commits: !`git log --oneline -10`

## Your Task

Implement an EDD feature from its spec using sub-agents, parallelizing
independent tasks where possible.

**Arguments:** `$ARGUMENTS`

### Step 1: Find the Feature

Parse the feature number from arguments. If not provided, infer it from
conversation context. Find the feature directory: `docs/features/NNN-*/`.

If the feature cannot be determined, ask the user which feature to work on.

### Step 2: Validate Status

The feature status must be "Specced" or "In Progress" (for resuming). If it's in
another status, report the error and suggest the appropriate command.

### Step 3: Read Feature Files

Read all three feature files:

- `evals.md` — the acceptance contract (read-only, never modify)
- `spec.md` — the implementation guide
- `tasks.md` — the ordered task list with dependencies

### Step 4: Analyze Dependencies

Parse the task list and build an execution graph:

- Identify which tasks are already completed (checked off)
- Identify which remaining tasks have no unmet dependencies → these can run now
- Group independent tasks into parallel batches
- Identify sequential chains where tasks depend on earlier tasks

### Step 5: Present Execution Plan

Show the user the execution plan before starting:

```
Batch 1 (parallel): Task 1, Task 2
Batch 2 (sequential, depends on Batch 1): Task 3
Batch 3 (parallel): Task 4, Task 5
```

Wait for user approval before proceeding.

### Step 6: Execute Batches

For each batch, spawn implementer sub-agent(s) via the Task tool, each with:

- The feature's `evals.md` content (read-only reference)
- The feature's `spec.md` content
- Only the specific task(s) assigned to this agent
- Relevant source file paths for the task's scope
- The EDD feature number

**Important:** Tell each implementer NOT to commit — you (the orchestrator)
handle all commits to ensure `tasks.md` updates are bundled with code changes.

#### Sequential tasks

After each implementer finishes:

1. Check off the task's checkbox in `tasks.md` (`- [ ]` → `- [x]`)
2. Stage all changes (implementation code + `tasks.md`) and commit together,
   following the project's commit convention (e.g.,
   `feat(scope): implement Task N (EDD-NNN)`)
3. Run the full test suite — if tests fail, fix before proceeding

#### Parallel batches

Spawn multiple agents simultaneously. After ALL agents in the batch finish:

1. Check off each completed task's checkbox in `tasks.md`
2. Run the full test suite to catch integration issues
3. If tests pass, stage all changes and commit — one commit per task with its
   code changes + `tasks.md` update if task boundaries are clear, otherwise one
   commit for the whole batch
4. If tests fail, determine whether the failure is from one task or a conflict
   between parallel tasks, and resolve before proceeding

#### Progress tracking

- **Update status** in `FEATURE_INDEX.md` to "In Progress" (if not already)
- Do NOT defer `tasks.md` updates to the end. Each task's checkbox MUST be
  checked off and committed immediately after the task (or its batch) completes

### Step 7: Fallback (No Sub-Agents)

If the Task tool is not available or sub-agents fail to spawn:

1. Read the implementer agent instructions from
   `${CLAUDE_PLUGIN_ROOT}/agents/implementer.md`
2. Implement tasks sequentially, following those instructions yourself
3. After completing each task:
   - Check off the task's checkbox in `tasks.md`
   - Stage and commit all changes (implementation code + `tasks.md`) together
   - Run the full test suite before starting the next task

### Step 8: Completion

When all tasks are complete:

1. Run the full test suite one final time
2. Verify all checkboxes in `tasks.md` are checked off — if any were missed,
   check them off and commit the fix now
3. Update status in `FEATURE_INDEX.md` to "Verifying"
4. Tell the user: "Implementation complete. Run `/edd-verify NNN` for
   independent verification against the evals."
