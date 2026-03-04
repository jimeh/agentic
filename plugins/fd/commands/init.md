---
description: Initialize the Feature Design (FD) tracking system in any project
allowed-tools: Read, Write, Glob, Grep, LS, Bash(mkdir:*), Bash(git log:*)
argument-hint: <optional project description>
source: https://gist.github.com/manuelschipper/149ebf6b2d150ccaccc84ee9a9df560f
---

# Initialize Feature Design (FD) System

Set up a lightweight feature tracking system in the current project. Creates
directory structure, index, templates, slash commands, and CLAUDE.md
conventions.

## Argument

Optional project description or notes: `$ARGUMENTS`

## Before Starting

1. Identify the **project root** — this is the current working directory
2. Check if an FD system already exists by looking for
   `docs/features/FEATURE_INDEX.md`
   - If it exists, report what's already set up and ask what to regenerate
   - If it doesn't exist, proceed with full setup

## Step 1: Infer Project Context

Before creating files, gather context to make the FD system project-aware:

1. Read `CLAUDE.md` if it exists — note the project name, key conventions,
   commit style
2. Check `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or similar
   for project name
3. Look at recent git log for commit message style (e.g., `FD-XXX:`, `feat:`,
   conventional commits)
4. Note the primary language and any existing docs structure

Use this context to customize:

- The FEATURE_INDEX.md header (project name instead of generic)
- The FD template examples (relevant to the project's domain)
- Commit message format (match existing conventions, default to
  `FD-XXX: description`)

1. **Changelog**: Ask the user: "Set up CHANGELOG.md with Keep a Changelog
   format and semantic versioning? (Y/n)"
   - Default: Yes (on by default)
   - If `CHANGELOG.md` already exists, report it and skip changelog creation
   - If the user opts out, skip Step 3b, omit the changelog step from fd-close,
     and omit the changelog section from CLAUDE.md

## Step 2: Create Directory Structure

```bash
mkdir -p docs/features/archive
mkdir -p .claude/commands
```

## Step 3: Create FEATURE_INDEX.md

Create `docs/features/FEATURE_INDEX.md`:

```markdown
# Feature Design Index

Planned features and improvements for {project_name}.

See `CLAUDE.md` for FD lifecycle stages and management guidelines.

## Active Features

| FD | Title | Status | Effort | Priority |
|----|-------|--------|--------|----------|
| - | - | - | - | No active features yet |

## Completed

| FD | Title | Completed | Notes |
|----|-------|-----------|-------|
| - | - | - | No completed features yet |

## Deferred / Closed

| FD | Title | Status | Notes |
|----|-------|--------|-------|
| - | - | - | No deferred features yet |

## Backlog

Low-priority or blocked items. Promote to Active when ready to design.

| FD | Title | Notes |
|----|-------|-------|
| - | - | No backlog items yet |
```

## Step 3b: Create CHANGELOG.md (if changelog enabled)

If the user opted in (or accepted the default), create `CHANGELOG.md` in the
project root:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
```

**Notes:**

- If `CHANGELOG.md` already exists, skip this step and report that it was found
- The `[Unreleased]` section starts empty — subsections (Added, Changed, Fixed,
  Removed) are created by `/fd-close` as entries are made
- **For Python projects with `pyproject.toml`**: Users can optionally add
  `setuptools-scm` for git-tag-based versioning (`"setuptools-scm>=8.0"` in
  `build-system.requires`, `[tool.setuptools_scm]` section). This is
  ecosystem-specific and NOT done automatically — just mention it for awareness.

## Step 4: Create FD Template

Create `docs/features/TEMPLATE.md`:

```markdown
# FD-XXX: Title

**Status:** Open
**Priority:** Low | Medium | High
**Effort:** Low (< 1 hour) | Medium (1-4 hours) | High (> 4 hours)
**Impact:** Brief description of what this enables

## Problem

What we're solving and why it matters.

## Solution

How to implement it. Be specific about approach.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `path/to/file` | CREATE / MODIFY | What and why |

## Verification

How to test that it works. Concrete steps.

## Related

- Links to related FDs, docs, or issues
```

## Step 5: Create Project-Local Slash Commands

Create the following command files in `.claude/commands/`:

### `.claude/commands/fd-new.md`

```markdown
# Create New Feature Design

Create a new FD file and add it to the index.

## Argument

Title or description of the feature: `$ARGUMENTS`

## Steps

### 1. Determine the next FD number

- Read `docs/features/FEATURE_INDEX.md`
- Find the highest FD number across Active, Completed, Deferred, and Backlog sections
- Next number = highest + 1 (start at 1 if no FDs exist)
- Pad to 3 digits: FD-001, FD-002, etc.

### 2. Parse the argument

- Extract a title from `$ARGUMENTS`
- If no argument provided, ask the user for a title and brief description
- Generate a filename-safe slug from the title (UPPER_SNAKE_CASE)

### 3. Create the FD file

- Copy structure from `docs/features/TEMPLATE.md`
- File: `docs/features/FD-{number}_{SLUG}.md`
- Fill in: FD number, title, Status: Open
- If the user provided enough context, fill in Problem and Solution sections
- Otherwise leave them as placeholders for the user to fill

### 4. Update FEATURE_INDEX.md

- Add a row to the **Active Features** table
- Include: FD number, title, status (Open), effort (if known), priority (if known)

### 5. Report

Print the created FD with its number, file path, and what sections need filling in.
Do NOT commit — the user will fill in details first.
```

### `.claude/commands/fd-explore.md`

```markdown
---
description: Explore any FD-enabled project - overview, FD history, recent activity
allowed-tools: Task, Read, Glob, Grep
---

# Explore Project

General-purpose exploration command for any project using the FD system. Uses parallel subagents to quickly build context.

## Step 1: Launch Parallel Subagents

Launch these THREE subagents IN PARALLEL (single message with multiple Task tool calls):

### Agent 1: Project Overview

Explore the project root to understand what this project is and how it works:

1. **Read key docs** — `CLAUDE.md`, `README.md`, any top-level docs
2. **Directory structure** — Glob for top-level files and key subdirectories
3. **Tech stack** — Identify languages, frameworks, build tools from config files (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Makefile`, etc.)
4. **Gotchas** — Note any warnings, constraints, or non-obvious conventions from CLAUDE.md

Return: project name, purpose, tech stack, directory layout, key gotchas.

### Agent 2: FD History

Explore the feature design system to understand what's been built and what's planned:

1. **Read index** — `docs/features/FEATURE_INDEX.md`
2. **Active FDs** — Read each active FD file (non-Complete status)
3. **Archived FDs** — List files in `docs/features/archive/` to understand completed work
4. **Recent FD commits** — Search git log for commits matching `FD-` pattern (last 20)

Return: active FDs table, count of archived FDs, recent FD commit summary.

### Agent 3: Recent Activity

Explore recent development activity to understand current momentum:

1. **Recent commits** — Last 15 commits with messages
2. **Modified files** — Files changed in the last 5 commits
3. **Branch context** — Current branch name and how far ahead of main
4. **Uncommitted work** — Check git status for staged/unstaged changes

Return: recent commit summary, files in flux, branch status, open work.

## Step 2: Synthesize Results

Combine all agent outputs into a single briefing:

### Project Overview
- Name, purpose, tech stack (from Agent 1)
- Key gotchas or constraints

### FD Status
- Active features table (from Agent 2)
- Archived count and notable completions

### Recent Activity
- What's been happening (from Agent 3)
- Current branch and open work

### Quick Reference

| Item | Value |
|------|-------|
| **Project** | {name} |
| **Branch** | {current branch} |
| **Active FDs** | {count} |
| **Recent focus** | {summary of last few commits} |

## Working Directory

Use the current working directory as the project root.
```

### `.claude/commands/fd-status.md`

```markdown
# Feature Design Status

Generate an up-to-date summary of active feature design items.

## Fast Path vs Full Grooming

**Decide which path to take based on conversation context:**

### Fast Path (just print the table)
Use this when you are **confident the index is up to date** — for example:
- You've been working on FDs in this session (closing, creating, updating)
- You just ran a full grooming pass recently
- The user just asked you to "print the status"

Simply read `docs/features/FEATURE_INDEX.md` and each active FD file, then output the table.

### Full Grooming (first invocation or uncertain state)
Use this when you have **no context about the current state**:
- Start of a new conversation
- You haven't touched any FDs yet
- The user explicitly asks for a grooming check

Perform these housekeeping checks:

#### 1. Status Sync Check
- Read each active FD file and compare its `**Status:**` line to the index
- If discrepancy, update the index to match the file (file is source of truth)
- Report any discrepancies found and fixed

#### 2. Archive Check
- Look for FD files in `docs/features/` (not in `archive/`) with status: Complete, Deferred, or Closed
- For each such FD not yet archived:
  - Move to `docs/features/archive/`
  - Ensure it's in the appropriate section of the index
- Report any files archived

#### 3. Orphan Check
- Check if any FDs in the index don't have corresponding files
- Check if any FD files exist that aren't in the index
- Report any orphans found

## Output

Format the output as a markdown table:

    ## Active Feature Designs

    | FD | Title | Status | Effort | Description |
    |----|-------|--------|--------|-------------|
    | FD-XXX | Title here | Status | Effort | Brief description |

    **Total:** X active items (Y design, Z open, W in progress)

If full grooming was performed and changes were made, prepend a grooming report.

## Notes

- Keep descriptions concise (< 60 chars if possible)
- Include a count summary at the bottom
```

### `.claude/commands/fd-close.md`

```markdown
# Close / Complete a Feature Design

Close an FD by marking it complete (or closed/deferred), archiving the file, and updating the index.

## Argument

The argument should contain:
- **FD number** (required-ish): e.g. `1` or `FD-001`
- **Disposition** (optional): `complete` (default), `closed`, or `deferred`
- **Notes** (optional): any additional context

Examples:
- `/fd-close 1` — mark FD-001 as Complete
- `/fd-close 2 deferred blocked on X` — mark FD-002 as Deferred
- `/fd-close 3 closed superseded by FD-005` — mark FD-003 as Closed
- `/fd-close` (no args) — infer from conversation context

Parse the argument: `$ARGUMENTS`

## Inferring the FD

If no FD number provided, infer from conversation context:
- Look at which FD was most recently discussed or worked on
- If exactly one FD is obvious, use it and state which one
- If ambiguous, ask the user

## Steps

### 1. Find and read the FD file

- Glob for `docs/features/FD-{number}_*.md`
- Read to get title, current status
- If already archived or not found, report and stop

### 2. Update the FD file

- Set `**Status:**` to `Complete`, `Closed`, or `Deferred`
- For Complete: add `**Completed:** {today YYYY-MM-DD}` after Status
- For Closed/Deferred: add `**Closed:** {today}` if not present

### 3. Update FEATURE_INDEX.md

- Read `docs/features/FEATURE_INDEX.md`
- Remove FD's row from **Active Features** table
- Add to appropriate section:
  - **Complete** → add to top of `## Completed` table with date and notes
  - **Closed/Deferred** → add to top of `## Deferred / Closed` table with status and notes

### 4. Update CHANGELOG.md (Complete only)

- Only for `complete` disposition (skip for closed/deferred)
- Read `CHANGELOG.md`
- Add an entry under `## [Unreleased]` in the appropriate subsection:
  - If the FD adds new functionality → `### Added`
  - If the FD changes existing behavior → `### Changed`
  - If the FD fixes a bug → `### Fixed`
  - If the FD removes something → `### Removed`
- Write a concise changelog entry with the FD number reference in parentheses at the end, e.g.: `- Add widget caching for faster load times (FD-003)`
- If the subsection doesn't exist yet under `[Unreleased]`, create it
- If `CHANGELOG.md` doesn't exist, skip this step

### 5. Archive the file

- Move FD file to `docs/features/archive/`

### 6. Commit

Commit all changes related to this FD in a single atomic commit:
- Check `git status` for uncommitted changes related to the FD implementation (code files modified during this session)
- Stage implementation files, the archived FD, deleted original FD path, `FEATURE_INDEX.md`, and `CHANGELOG.md` (if updated)
- Commit with message: `FD-{number}: {title}`

### 7. Summary

Report:
- FD number and title
- Disposition (Complete / Closed / Deferred)
- Status updated in FD file
- Moved from Active to the appropriate section in index
- Changelog updated (if complete disposition)
- Archived to `docs/features/archive/`
- Committed: {short hash}
```

### `.claude/commands/fd-deep.md`

````markdown
---
description: Deep parallel analysis — spawn multiple agents to explore a hard problem from different angles, then synthesize
allowed-tools: Task, Read, Glob, Grep
---

# Deep Analysis

Parallel exploration of a hard problem from multiple angles, inspired by test-time compute scaling. Use when stuck, when the problem is complex enough to benefit from diverse perspectives, or when you need "big brains" on something.

## Argument

Problem description or context: `$ARGUMENTS`

## Phase 1: Understand the Problem

1. **Parse the argument** — what is the user stuck on? What are they trying to achieve?
2. **Gather context** — read conversation history for what's already been tried or discussed
3. **Check for active FD** — if there's a relevant FD file, read it for design context
4. **Scan the codebase** — do a quick targeted search to understand the relevant code area (key files, architecture, constraints). Keep this brief — the agents will do the deep exploration.

## Phase 2: Design the Exploration

Based on the problem, design **4 exploration angles**. These are NOT redundant — each agent gets a **distinct lens** on the problem.

**Before launching, check orthogonality:** Would two of these angles likely explore the same code paths and reach similar conclusions? If so, reframe one to ensure genuine diversity.

**How to choose angles — infer from the problem type:**

For **performance optimization**:
- Algorithmic: Can the approach itself be fundamentally different?
- Structural: Can the data layout, schema, or architecture reduce work?
- Incremental: Can we avoid redoing work (caching, materialization, deltas)?
- Environmental: Are we fighting the platform? (query patterns, Python GIL, network topology)

For **architecture/design decisions**:
- Simplicity: What's the minimal viable approach?
- Scalability: What happens at 10x/100x current load?
- Precedent: How do similar systems/libraries solve this?
- Contrarian: What if the obvious approach is wrong? What's the unconventional path?

For **debugging / "why is this broken"**:
- Symptoms: Trace the failure path precisely — what's the chain of events?
- Environment: What changed? Versions, configs, data, dependencies?
- Assumptions: What are we assuming that might not be true?
- Similar: Has this pattern of failure been seen elsewhere in the codebase or in public?

For **anything else** — choose angles that maximize diversity of insight. Ask: "If these 4 experts were in a room, what different specialties would give me the most useful debate?"

**For each angle, decide:**
- What codebase areas the agent should explore (specific files, directories, patterns)
- What question the agent should answer
- How deep vs. broad the agent should go
- What existing context (if any) to seed the agent with — only what's necessary, avoid anchoring

## Phase 3: Launch Parallel Exploration

**Briefly tell the user** what angles you're exploring (2-3 words each) — then launch immediately. Don't wait for approval. Speed matters when stuck.

Launch **4 Explore agents IN PARALLEL** (single message with 4 Task tool calls). Use `model: "opus"` explicitly on each agent to ensure heavyweight reasoning. Each agent gets:

```
You are exploring a specific angle of a hard problem. Your analysis is input to a multi-agent synthesis — be precise, flag uncertainties, and show your evidence.

## Problem
{problem description}

## Your Angle
{specific lens — what you're looking for, what question you're answering}

## Where to Look (Starting Points)
{specific files, directories, or search patterns to start with}

These are entry points, not the complete scope. Follow evidence wherever it leads — if the trail points to related code outside this list, explore it.

## Key Constraint
You have read-only tools (Glob, Grep, Read). Use them liberally. If you can't verify something exists, don't claim it. Better to say "I couldn't locate a config file for X" than to guess at its name or path.

## Instructions
- Use Glob, Grep, and Read to thoroughly explore the relevant code
- Think deeply about your specific angle — don't try to solve the whole problem
- Look for evidence, patterns, constraints, and opportunities related to your angle
- Note anything surprising or that contradicts assumptions
- Be concrete — reference specific files, functions, line numbers, data flows
- If you find something important outside your angle, note it briefly but stay focused
- Before you finalize: is there evidence that contradicts your recommendation? If yes, address it directly rather than ignore it

## Output
Return a focused analysis (aim for 600-1000 words):

1. **Key findings** — specific observations with evidence. For each finding, cite the file/line or code pattern that shows it's true. Avoid vague claims like "this is slow" — show why.

2. **Implications** — what this means for the problem. For each implication, explain the logical link: if this finding is true, then we should try X because [reason].

3. **Recommendation** — your angle's proposed direction:
   - **Proposed approach:** [specific, actionable idea]
   - **Why this angle suggests it:** [link findings → recommendation]
   - **Tradeoffs:** [what you'd give up]
   - **Key assumptions:** [what has to be true for this to work]
   - **Biggest uncertainty:** [what would most change your mind]
```

## Phase 4: Verify Key Claims

Before synthesizing, two verification passes:

### Pass 1: Contradiction Detection

Scan all 4 agent reports for **opposing claims**. Examples:
- Agent A says "this runs synchronously" while Agent B says "this is async"
- Agent A says "no index on this column" while Agent C assumes an index exists
- Two agents recommend opposite directions

Flag contradictions prominently. **Prioritize verifying contradicted claims first** — these are where the highest-value corrections live.

### Pass 2: Factual Verification

**Cross-check the most important factual claims** from the agents. Agents can hallucinate file paths, function signatures, config options, or behavioral assumptions.

**What to verify:**
- **File paths and function names** — do the files/functions agents referenced actually exist? Spot-check with Glob/Grep.
- **Behavioral claims** — "this function does X" or "this config controls Y" — Read the actual code for the 2-3 most critical claims that the recommendation will hinge on.
- **Performance/complexity claims** — if an agent says "this is O(n²)" or "this query scans the full table," verify against the actual code or query plan.
- **Assumption checks** — if agents assumed something about the system (e.g., "this runs synchronously," "this table has an index on X"), verify the ones that matter most.

**How to verify:**
- Focus on the **top 3-5 claims that would change the recommendation if wrong**. Don't verify everything — verify what matters.
- Use Glob, Grep, and Read directly (no subagents — this should be fast).
- If a claim is wrong, note the correction. If it's right, move on.

**Output:** Note any corrections or confirmations. Flag anything that was wrong — this changes the synthesis.

## Phase 5: Synthesize

After verification, synthesize the agents' findings (with corrections applied) into a single analysis. This is the critical step — don't just concatenate.

**Synthesis structure:**

### 1. Agreements
Where do multiple angles converge? High-confidence insights.

### 2. Tensions
Where do angles disagree or present tradeoffs? These are the real design decisions.

### 3. Surprises
What did agents find that wasn't expected? Novel insights that change the framing.

### 4. Corrections
Any agent claims that were wrong or misleading, and what the truth is. Be transparent — this builds trust in the analysis.

### 5. Recommendation
Your synthesized recommendation. Be opinionated — rank the options, state which direction you'd go and why. Tag each element with confidence (High/Medium/Low) and a one-line justification. Include:
- **Proposed approach** — the synthesized best path forward
- **Key tradeoffs** — what you're giving up
- **Risks** — what could go wrong
- **Key assumptions** — what the recommendation depends on being true
- **First step** — the concrete next action

### 6. Assumption Check
After drafting the recommendation, note what assumptions it hinges on. Verify those specific assumptions with a quick Glob/Grep/Read check. If any fail, flag them and reassess.

### 7. If applicable: FD Update
If there's an active FD related to this problem, propose specific updates to the FD's Solution section based on the analysis. Don't update the file — present the proposed changes for the user to approve.

## Notes

- **Agent count**: Always 4. Four distinct angles. No exceptions.
- **Agent type**: Always use `subagent_type: "Explore"` with `model: "opus"` — read-only research agents on the heaviest model.
- **Thoroughness**: Tell agents to be "very thorough" in their Task descriptions.
- **No anchoring**: Don't give agents each other's angles. They should explore independently.
- **Speed over perfection**: The user is stuck. A good-enough synthesis in 2 minutes beats a perfect one in 10. Don't over-polish the output.
````

### `.claude/commands/fd-verify.md`

```markdown
# Verify Implementation

Post-implementation workflow: commit, proofread, fix, then propose a verification plan.

## Argument

Optional context about what was implemented. If empty, infer from recent conversation and git diff.

Parse the argument: `$ARGUMENTS`

## Phase 1: Commit (no approval needed)

1. Run `git status` and `git diff` to see uncommitted changes
2. If there are uncommitted changes related to the implementation:
   - Stage the relevant files
   - Commit with a concise message
3. If nothing to commit, note this and continue

## Phase 2: Proofread (no approval needed)

Review ALL code changes from this implementation session. Use `git diff` against the base commit.

For each modified file, check for:

**Correctness:**
- Logic errors, wrong variable names
- Missing edge cases (None/empty checks)
- Injection or escaping issues
- Parameter substitution bugs

**Consistency:**
- Naming conventions match codebase
- Patterns match existing code (error handling, logging)

**Completeness:**
- All code paths covered
- Config/schema changes documented

**Cleanliness:**
- No debug prints or TODOs left
- No unnecessary changes outside scope
- Imports are clean

If issues found:
- Fix them immediately
- Commit fixes separately with a descriptive message (e.g., `FD-XXX: Proofread fixes` if working on an FD, otherwise a plain descriptive message). Infer the FD number from the branch name or recent commits if available.

If clean, state the code looks good.

## Phase 3: Verification Plan (requires user approval)

Based on the implementation, propose a concrete verification plan:

**Think about:**
- What can be tested locally (unit tests, linting, compilation)
- What needs manual or integration testing
- What edge cases to cover
- What signals confirm success

**Format as numbered steps**, e.g.:
1. Run unit tests to verify logic
2. Check output matches expected format
3. Test edge case: empty input
4. Verify no regressions in related code

Present plan and **wait for approval** before executing.

## Phase 4: Execute (after approval)

Execute the verification plan step by step, reporting results.
```

## Step 6: Update Project CLAUDE.md

Read the project's `CLAUDE.md` (in the project root). If it doesn't exist,
create it with a minimal header and the FD section below.

**Check if an FD section already exists** by searching for `## Feature Design`
or `## FD Management`. If found, skip this step and report that it already
exists.

Otherwise, **append** the following section:

````markdown

---

## Feature Design (FD) Management

Features are tracked in `docs/features/`. Each FD has a dedicated file (`FD-XXX_TITLE.md`) and is indexed in `FEATURE_INDEX.md`.

### FD Lifecycle

| Stage | Description |
|-------|-------------|
| **Planned** | Identified but not yet designed |
| **Design** | Actively designing (exploring code, writing plan) |
| **Open** | Designed and ready for implementation |
| **In Progress** | Currently being implemented |
| **Pending Verification** | Code complete, awaiting verification |
| **Complete** | Verified working, ready to archive |
| **Deferred** | Postponed (low priority or blocked) |
| **Closed** | Won't implement (superseded or not needed) |

### Slash Commands

| Command | Purpose |
|---------|---------|
| `/fd-new` | Create a new feature design |
| `/fd-explore` | Explore project - overview, FD history, recent activity |
| `/fd-deep` | Deep parallel analysis — 4 agents explore a hard problem from different angles, verify claims, synthesize |
| `/fd-status` | Show active FDs with status and grooming |
| `/fd-verify` | Post-implementation: commit, proofread, verify |
| `/fd-close` | Complete/close an FD, archive file, update index, update changelog |

### Conventions

- **FD files**: `docs/features/FD-XXX_TITLE.md` (XXX = zero-padded number)
- **Commit format**: `FD-XXX: Brief description`
- **Numbering**: Next number = highest across all index sections + 1
- **Source of truth**: FD file status > index (if discrepancy, file wins)
- **Archive**: Completed FDs move to `docs/features/archive/`

### Managing the Index

The `FEATURE_INDEX.md` file has four sections:

1. **Active Features** — All non-complete FDs, sorted by FD number
2. **Completed** — Completed FDs, newest first
3. **Deferred / Closed** — Items that won't be done
4. **Backlog** — Low-priority or blocked items parked for later

### Inline Annotations (`%%`)

Lines starting with `%%` in any file are **inline annotations from the user**. When you encounter them:
- Treat each `%%` annotation as a direct instruction — answer questions, develop further, provide feedback, or make changes as requested
- Address **every** `%%` annotation in the file; do not skip any
- After acting on an annotation, remove the `%%` line from the file
- If an annotation is ambiguous, ask for clarification before acting

This enables a precise review workflow: the engineer annotates FD files or plan docs directly in the editor, then asks Claude to address all annotations — tighter than conversational back-and-forth for complex designs.

### Changelog

- **Format**: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- **Updated by**: `/fd-close` (complete disposition only) adds entries under `[Unreleased]`
- **FD references**: Entries end with `(FD-XXX)` for traceability
- **Subsections**: Added, Changed, Fixed, Removed
- **Releasing**: Rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`, add fresh `[Unreleased]` header
```

**If changelog was NOT enabled**, omit the `### Changelog` subsection entirely and use the original `/fd-close` description (without "update changelog").
````

## Step 7: Summary

Report what was created:

```markdown
## FD System Initialized

### Files Created
- `docs/features/FEATURE_INDEX.md` — Feature index
- `docs/features/TEMPLATE.md` — FD file template
- `docs/features/archive/` — Archive directory
- `CHANGELOG.md` — Changelog (if enabled)
- `.claude/commands/fd-new.md` — Create new FD
- `.claude/commands/fd-explore.md` — Project exploration
- `.claude/commands/fd-deep.md` — Deep parallel analysis (4 agents + verify + synthesize)
- `.claude/commands/fd-status.md` — Status and grooming
- `.claude/commands/fd-verify.md` — Verification workflow
- `.claude/commands/fd-close.md` — Close and archive FD (with changelog update)
- `CLAUDE.md` — Updated with FD conventions

### Next Steps
1. Run `/fd-new` to create your first feature design
2. Run `/fd-status` to check the current state
```
