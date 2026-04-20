---
name: vuln-scan-orchestrator
description: Orchestrate a defensive vulnerability scan of a local software
  project by analyzing the repo at a high level, creating a bounded playbook,
  coordinating sub-agents to review each area, verifying findings, and
  managing durable vuln-scan skip decisions such as false positives or
  accepted risks.
---

# Vuln Scan Orchestrator

Perform a repo-level defensive security review by decomposing the target project
into a small number of meaningful focus areas, assigning each area to one
reviewer, verifying each non-skipped finding, and keeping durable scan artifacts
under the target project's `security/` directory.

Use the current working directory as the target project root unless the user
explicitly points elsewhere.

If the user is only asking to mark an existing finding as a false positive or
accepted risk for future scans, skip the scan workflow and go straight to the
follow-up mode in "Durable Skip Files".

## Workflow

1. Inspect the target project at a high level.
2. Read existing skip files from `security/vuln-scan-skips/` before planning.
3. Identify security-relevant subsystems and collapse them into disjoint focus
   areas.
4. Cap the area list at 6. Prefer 4-6 areas when the project is medium or large.
   Spawn at least 2 reviewers when there is more than 1 meaningful area.
5. Create a run id, write the playbook, and initialize `findings-summary.md` and
   `verified-results.md`.
6. Spawn one reviewer per focus area with explicit ownership, relevant skip
   entries, and exact output paths.
7. Wait for all reviewers, then aggregate, deduplicate, and assign stable
   finding IDs.
8. Verify each non-skipped candidate finding in more detail, updating
   `findings-summary.md` and appending actionable entries to
   `verified-results.md`.
9. Write the final summary state and run manifest.

## Artifact Layout

Write all outputs under the target project's top-level `security/` directory.
Use timestamped run directories only. Do not overwrite prior runs.

Required files for each run:

- `security/<run-id>/vuln-scan-playbook.md`
- `security/<run-id>/findings/<area-slug>.md`
- `security/<run-id>/findings-summary.md`
- `security/<run-id>/verified-results.md`
- `security/<run-id>/run-manifest.json`

Durable skip files live outside run directories:

- `security/vuln-scan-skips/<issue-slug>.md`

Use a sortable UTC timestamp for `<run-id>`, for example `2026-04-17T18-45-00Z`.

## Finding IDs

After aggregation and deduplication, assign a stable run-local finding ID to
every candidate issue, such as `F-001`, `F-002`, and `F-003`.

Reuse the same finding ID in:

- `findings-summary.md`
- `verified-results.md`
- `run-manifest.json`

Do not renumber findings after verification starts. A finding that is later
rejected, demoted, or skipped keeps its ID so follow-up references remain
stable.

## Durable Skip Files

Before planning a scan, read all skip files under `security/vuln-scan-skips/`,
if that directory exists.

Use one Markdown file per canonical issue under a stable issue slug. Treat these
files as human-authored notes that may be created or edited by either people or
agents.

Do not require YAML frontmatter, fixed headings, or a strict schema. Future
scans should read skip files heuristically by extracting useful signals from the
title, headings, bullets, code references, file paths, and prose.

Useful signals include:

- issue title or close aliases
- vulnerability class or category
- affected components, subsystems, or paths
- distinctive behavioral details that identify the issue
- why it is skipped
- what changes should invalidate the skip and force re-review

Agents may create or update skip files, but they should keep them concise,
readable, and easy for humans to maintain in git.

When an agent creates or updates a skip file, it should prefer plain Markdown
with a short title and compact prose or bullets over a rigid machine template.
If the user has an obvious local convention for skip files, follow that
convention instead of inventing a new format.

Match candidate findings against skip files by:

1. issue title or recognizable aliases
2. nearby cited paths, components, subsystems, or code references
3. whether the current finding still fits the same underlying behavior and
   rationale

If the match is still accurate and the code has not materially changed, mark the
finding as skipped and reference the skip file path instead of fully
re-evaluating it.

If the code appears materially changed, the finding is broader than the saved
rationale, the distinguishing details no longer line up, or the title match is
weak, do not silently suppress it. Record it as `skip needs review` and verify
it normally.

If the user later says a specific issue should be ignored by future scans or is
a false positive, create or update the matching skip file instead of creating a
new run. The skip file should describe the issue pattern itself well enough for
future scans to recognize the same underlying finding without relying on
run-local finding IDs or paths inside `security/<run-id>/...`.

## Focus-Area Planning

Derive areas from trust boundaries and attack surfaces, not from arbitrary file
count splits.

Good area candidates include:

- request parsing and input handling
- auth, session, and permission logic
- persistence, query construction, and data access
- file handling, archive handling, and path construction
- template rendering, command execution, and outbound requests
- background jobs, queues, IPC, or plugin/module loading
- native bindings, parsers, protocol handlers, or serialization code

Merge adjacent areas when the repo is small or when several paths share the same
trust boundary. Avoid areas that overlap heavily.

For each area, define:

- area name
- rationale
- owned paths or subsystems
- excluded neighboring paths to avoid overlap
- vulnerability classes to check
- area-specific review hints
- relevant skip entries
- reviewer report path

## Playbook Requirements

Write `vuln-scan-playbook.md` before spawning reviewers.

The playbook must contain:

- target root and run id
- concise repo overview
- consulted skip files, if any
- the final bounded area list
- one section per area with:
  - rationale
  - owned paths
  - excluded paths
  - vulnerability classes to check
  - review hints
  - relevant skip entries
  - assigned report path

Vulnerability classes should be tailored to each area. Prefer concrete classes
such as:

- auth bypass
- privilege escalation
- path traversal
- SSRF
- command injection
- SQL or query injection
- unsafe deserialization
- template injection
- archive extraction flaws
- sandbox or boundary escapes
- memory-safety issues
- incomplete input validation
- unsafe secret handling
- broken trust assumptions

## Spawn Semantics and Fallbacks

Prefer clean-context reviewer prompts. Area reviewers and verifier agents
already receive bounded ownership, exact file paths, and concrete output paths,
so they do not need the parent's full conversation history.

When spawning sub-agents:

- if you use `fork_context: true`, omit `agent_type`, `model`, and
  `reasoning_effort`
- if you need a specific `agent_type`, `model`, or `reasoning_effort`, do not
  fork full context; pass the required context explicitly instead

If a spawn fails because the parameters are incompatible, correct the spawn
shape and retry once.

If sub-agents remain unavailable after the retry, continue with a bounded local
review or verification pass instead of looping on retries.

## Reviewer Instructions

Spawn one reviewer per area. Tell each reviewer that it is not alone in the
codebase and it must stay within its assigned area.

Each reviewer prompt should include:

- target project root
- run id
- area name
- owned paths or subsystems
- excluded paths or neighboring areas to avoid overlap
- vulnerability classes to check
- relevant skip entries, including file paths and rationale
- exact output file path

Each reviewer must:

1. Review only its assigned area, while following call paths into closely
   related files when necessary.
2. Focus on the listed vulnerability classes first.
3. If a candidate finding matches a skip file and still fits its rationale, note
   it as skipped with the skip file path instead of fully re-evaluating it.
4. If a skip only partially matches or appears stale, record
   `skip needs review`.
5. Write its report to disk.
6. Return the same high-level summary back to the parent agent.

Each reviewer report must include:

- area name
- scope reviewed
- paths inspected
- bug classes checked
- candidate findings
- skipped findings with skip-file references
- skip decisions needing review
- notable non-findings or coverage notes
- confidence
- open questions or follow-ups

If there is no credible finding, say so explicitly and still include coverage
notes.

## Aggregation Rules

After reviewers finish:

- collect all returned summaries
- read the reviewer report files
- deduplicate overlapping findings
- assign stable finding IDs to every candidate issue
- separate non-skipped candidates from lower-confidence leads
- separate findings skipped by durable skip files
- keep a list of `skip needs review` items
- record areas with no credible finding

`findings-summary.md` is the concise scan index and outcome tracker. It should
be cross-referential, not a second long-form report.

Write `findings-summary.md` with these sections:

- Target and Run
- Confirmed Findings Index
- Rejected or Demoted Findings
- Skipped Findings
- Skip Decisions Needing Review
- Lower-Confidence Leads
- Areas Reviewed With No Credible Finding
- Recommended Follow-Ups

For each confirmed finding in `findings-summary.md`, include only:

- finding ID
- title
- final severity and status
- a one-line synopsis
- a direct pointer to the matching `verified-results.md` entry

For each rejected or demoted finding, include:

- finding ID
- title
- final status or severity
- a short reason for the outcome

Reference skip files directly in the skipped findings section.

## Verification Pass

After aggregation, verify every non-skipped candidate finding before the run is
complete.

Default mode:

- the parent agent verifies findings sequentially
- the parent agent is the only writer to `findings-summary.md`
- the parent agent is the only writer to `verified-results.md`

Hybrid mode:

- use clean-context verifier agents only when the scan is large or the user
  explicitly asks for extra rigor
- still keep `findings-summary.md` and `verified-results.md` writes serialized
  through the parent agent

If verifier agents are used, give them only the task-local context they need:
the finding summary, the cited evidence, the relevant paths, and the required
output shape. Do not leak extra conclusions unless the verification task needs
them.

Initialize `verified-results.md` before verification. It must include:

- target root
- run id
- source summary path
- review goal
- a short note that only confirmed actionable findings get full entries

`verified-results.md` is the self-contained fix handoff file. It must be
sufficient for another AI agent to investigate and implement a fix without
reopening `findings-summary.md`.

Only create full entries in `verified-results.md` for findings that remain both
legitimate and actionable after verification.

Do not create full `verified-results.md` entries for:

- false positives
- fully rejected findings
- purely speculative leads
- findings demoted below actionable status

As each finding is verified:

- update `findings-summary.md` immediately with the new outcome
- append to `verified-results.md` only if the finding remains confirmed and
  actionable

Each `verified-results.md` entry must include:

- finding ID
- title
- final severity and status
- vulnerability class
- affected files, components, or code paths
- exploit preconditions or attacker requirements
- root cause
- concrete evidence with code references
- impact
- remediation direction
- validation hints or tests to run after a fix
- caveats or residual concerns
- source links back to the playbook, reviewer report, and summary entry

Verification should re-check the cited code, surrounding context, relevant
tests, and any design intent that changes the severity or validity of the
finding. Be willing to reject findings or demote them to lower severity when the
original reviewer summary overfit to dangerous-looking code.

## Run Manifest

Write `run-manifest.json` with:

- run id
- target root
- focus areas
- reviewer-to-report mapping
- reviewer completion status
- summary path
- results path
- finding IDs with final outcome states
- skip files consulted
- skipped findings recorded for this run

`summary path` must point to `findings-summary.md`. `results path` must point to
`verified-results.md`.

## Follow-Up Mode

If the user asks to mark a finding as ignored in future scans, or says it is a
false positive or accepted risk:

1. Find the matching issue from `verified-results.md` when present; otherwise
   fall back to `findings-summary.md`.
2. Create or update `security/vuln-scan-skips/<issue-slug>.md`.
3. Write a concise Markdown note that describes:
   - the issue title or close aliases
   - whether it is a false positive or accepted risk
   - the affected components or paths
   - the distinguishing behavior that future scans should match
   - why it is being skipped
   - what kinds of code changes should invalidate the skip
4. Do not rely on run-local finding IDs or per-run artifact paths as the durable
   identifier for the skip.

If the user's reference to the issue is ambiguous, use the most likely matching
finding and state that assumption clearly.

## Execution Guidance

Keep the workflow bounded and practical:

- do not create more than 6 areas
- do not create one reviewer per file
- prefer fewer, coherent areas over many tiny ones
- keep reviewer ownership disjoint
- preserve prior `security/<run-id>/` outputs
- keep skip files outside run directories

If the repo is too small for multiple meaningful areas, it is acceptable to use
1 reviewer. Otherwise, spawn at least 2.

Treat this as defensive analysis only. Do not produce exploit code. Keep the
reports focused on review findings, evidence, verification, and remediation
direction.
