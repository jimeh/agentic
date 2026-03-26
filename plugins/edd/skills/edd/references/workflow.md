# EDD Workflow Reference

Detailed step-by-step reference for the Eval-Driven Development workflow.

## Phase 1: Draft

**Goal:** Define what "done" looks like before writing any code.

**Who:** Human (with optional agent assistance).

**Steps:**

1. Run `/edd-new <description>` to create the feature directory and scaffold
   `evals.md`
2. Iterate with `/edd-draft <number>` to refine evals:
   - Pass feedback: `/edd-draft 3 add edge cases for concurrent access`
   - Run with no feedback for a gap assessment or brainstorming
   - The draft command can also spawn the eval-brainstormer agent
3. Continue refining until the evals feel solid — when you could hand them to a
   QA engineer and they'd know exactly what to test

**Duration:** As long as needed. This is the most important phase.

**Transition:** Run `/edd-spec <number>` to freeze evals and move to Phase 2.

## Phase 2: Spec

**Goal:** Agent derives a product spec and implementation plan from the frozen
evals — then iterates on it with the human until both sides are satisfied.

**Who:** spec-writer sub-agent (clean context).

### Fresh Generation

1. `/edd-spec <number>` transitions the feature to "Evals Ready" (freeze)
2. A spec-writer sub-agent is spawned with a clean context containing only:
   - The feature's `evals.md`
   - The project's CLAUDE.md/AGENTS.md and relevant source files
3. The spec-writer produces `spec.md`:
   - Feature summary in its own words (NOT reformatted evals)
   - Data model changes
   - API/function signatures
   - UI components needed
   - Integration points with existing code
   - Questions/Assumptions section for gaps
4. The spec-writer produces `tasks.md`:
   - Ordered implementation steps
   - Each task small enough for one commit
   - Each task references which acceptance criteria it satisfies
   - Dependencies between tasks clearly noted
   - Independent tasks explicitly marked as parallelizable
5. Feature status transitions to "Specced"
6. Human reviews spec and tasks before proceeding

### Refinement

Re-running `/edd-spec <number>` when `spec.md` and `tasks.md` already exist
triggers refinement instead of regeneration. Feedback comes from two sources:

- **Argument text:** `/edd-spec 3 split task 4 into smaller steps`
- **Inline notes:** HTML comments (`<!-- ... -->`), blockquotes (`>`), or
  markers like `NOTE:`, `TODO:`, `FIXME:`, `Q:` left directly in the files

The spec-writer receives the existing spec, tasks, and collected feedback, then
refines (not rewrites) both files and removes addressed annotations.

If neither source has feedback, the command asks the user whether to regenerate
from scratch or add feedback first.

**Iteration loop:** Review → annotate or pass feedback → `/edd-spec NNN` →
repeat until satisfied → `/edd-impl NNN`.

**Why a clean context?** The agent that helped write evals during Draft has
accumulated conversation history, assumptions, and implicit context. A fresh
agent reading only the frozen evals produces a spec that is objectively derived
from the criteria, not influenced by the discussion that produced them.

## Phase 3: Implement

**Goal:** Build the feature according to the spec, verified against the evals.

**Who:** implementer sub-agent(s) (clean context per task).

**Steps:**

1. `/edd-impl <number>` reads evals.md, spec.md, and tasks.md
2. The orchestrator analyzes task dependencies and identifies parallelizable
   batches
3. The orchestrator presents an execution plan for human approval:
   - Sequential tasks (have dependencies)
   - Parallel batches (independent tasks)
4. For each batch, implementer sub-agents are spawned, each receiving:
   - The feature's `evals.md` (read-only reference)
   - The feature's `spec.md`
   - Only the specific task(s) assigned to this agent
   - Relevant source files for the task's scope
5. Each implementer:
   - Implements its assigned task(s)
   - Writes permanent test files in the project's test directory
   - Makes atomic commits referencing the EDD feature number
   - Runs relevant tests to confirm its work
6. After each batch completes, the orchestrator:
   - Updates tasks.md (checks off completed tasks)
   - Runs the full test suite for integration issues
   - Resolves conflicts between parallel tasks if needed
7. Feature status is "In Progress" during, "Verifying" when all tasks complete

**Parallel execution rationale:** Rather than one agent grinding through 8 tasks
in a single session (accumulating context, losing coherence), each implementer
gets a clean context with just its task. Independent tasks run simultaneously.
The orchestrator manages ordering and integration.

**Fallback without sub-agents:** If the environment doesn't support sub-agents,
implement sequentially. Use context resets between tasks where possible (finish
a task, commit, start fresh for the next).

### Dependency Analysis

Tasks in `tasks.md` use dependency markers:

```markdown
## Tasks

- [ ] **Task 1**: Set up database schema
  - Criteria: AC-1, AC-2
  - Dependencies: none
  - Parallelizable: yes (with Task 2)

- [ ] **Task 2**: Create API endpoints
  - Criteria: AC-3, AC-4
  - Dependencies: none
  - Parallelizable: yes (with Task 1)

- [ ] **Task 3**: Wire up frontend
  - Criteria: AC-5, AC-6
  - Dependencies: Task 1, Task 2
  - Parallelizable: no
```

The orchestrator reads these markers to build the execution graph.

## Phase 4: Verify

**Goal:** Independent, skeptical verification against the original evals.

**Who:** verifier sub-agent (clean context).

**Steps:**

1. `/edd-verify <number> [URL]` spawns a verifier sub-agent with:
   - The feature's `evals.md` (the acceptance contract)
   - The current source code
   - The project's test suite and how to run it
   - Optionally, a URL where the app is running
2. The verifier does NOT receive spec.md or tasks.md — it checks against evals
   only
3. For each acceptance criterion and test case:
   - **Automated tests:** Run the test suite, report pass/fail per test
   - **Code inspection:** For structural criteria, inspect the actual code
   - **Browser testing:** If a URL was provided and browser tools are available,
     test the running app
   - **Manual verification:** Document what the human needs to check
4. The verifier writes `verification.md` with PASS/FAIL per criterion
5. After criteria checks, a general code review: dead code, error handling,
   unused imports, security
6. All pass → status "Done". Any fail → describe what's wrong, suggest fixes

**Why exclude spec.md?** The verifier checks against the EVALS, not the
implementation plan. If the spec missed something from the evals and the
implementation followed the spec faithfully, that's still a failure. The evals
are the source of truth.

**Why a separate agent?** An agent that wrote the code cannot objectively verify
it. The verifier has never seen the implementation discussions, the spec
trade-offs, or the workarounds. It only knows what the evals require and what
the code actually does.

## Phase 5: Close

**Goal:** Archive the feature and confirm the work is complete.

**Steps:**

1. `/edd-close <number> complete` for finished features
2. `/edd-close <number> deferred` to postpone
3. `/edd-close <number> dropped` to cancel
4. The command updates FEATURE_INDEX.md appropriately
5. For completed features, confirms test files are in the permanent test suite

## Reverting to Draft

If the evals need to change after the freeze (because scope changed or something
was missed), the user must explicitly request a revert to Draft status. This is
intentional friction — it forces conscious acknowledgment that the goalposts
have moved.

After reverting:

- evals.md is editable again
- spec.md and tasks.md should be regenerated (they were derived from the old
  evals)
- Any implementation work may need to be reconciled with the updated evals

## Commit Convention

EDD features reference their feature number in commit messages. The format
adapts to the project's existing commit convention:

- **Conventional commits:** `feat(auth): add login flow (EDD-001)`
- **No convention detected:** `EDD-001: add login flow`
- **Custom prefix convention:** Follow the project's pattern, append `(EDD-NNN)`

The implementer agent infers the project's commit style from git log and
CLAUDE.md/AGENTS.md.
