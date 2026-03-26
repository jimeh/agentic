---
description: Implement a feature from its spec using parallel sub-agents where possible
allowed-tools: Read, Write, Edit, Glob, Grep, LS, Bash(cat:*), Bash(git status:*), Bash(git log:*), Task, NotebookEdit
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

For each batch:

1. **Spawn implementer sub-agent(s)** via the Task tool, each with:
   - The feature's `evals.md` content (read-only reference)
   - The feature's `spec.md` content
   - Only the specific task(s) assigned to this agent
   - Relevant source file paths for the task's scope
   - The project's commit convention (from git log and CLAUDE.md)
   - The EDD feature number for commit messages

2. **For parallel batches:** spawn multiple agents simultaneously. Each agent
   works on its own task(s) independently.

3. **For sequential tasks:** spawn one agent at a time, waiting for completion
   before starting the next.

4. **After each batch completes:**
   - Update `tasks.md` — check off completed tasks
   - Run the full test suite to catch integration issues
   - If tests fail, determine whether the failure is from this batch or a
     conflict between parallel tasks, and resolve before proceeding

5. **Update status** in `FEATURE_INDEX.md` to "In Progress" (if not already)

### Step 7: Fallback (No Sub-Agents)

If the Task tool is not available or sub-agents fail to spawn:

1. Read the implementer agent instructions from
   `${CLAUDE_PLUGIN_ROOT}/agents/implementer.md`
2. Implement tasks sequentially, following those instructions yourself
3. Between tasks, commit your work to create a natural context boundary
4. Run tests after each task

### Step 8: Completion

When all tasks are complete:

1. Run the full test suite one final time
2. Update `tasks.md` — all tasks should be checked off
3. Update status in `FEATURE_INDEX.md` to "Verifying"
4. Tell the user: "Implementation complete. Run `/edd-verify NNN` for
   independent verification against the evals."
