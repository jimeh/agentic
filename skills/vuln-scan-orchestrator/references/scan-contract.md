# Scan contract

Read before creating run artifacts or assigning reviewers.

## Artifact Layout

Write all outputs under the target project's top-level `security/vuln-scan/`
directory. Use timestamped run directories only. Do not overwrite prior runs.

Required files for each run:

- `security/vuln-scan/<run-id>/vuln-scan-playbook.md`
- `security/vuln-scan/<run-id>/findings/<area-slug>.md`
- `security/vuln-scan/<run-id>/findings-summary.md`
- `security/vuln-scan/<run-id>/verified-results.md`
- `security/vuln-scan/<run-id>/run-manifest.json`

Durable skip files live outside run directories:

- `security/vuln-scan/skips/<issue-slug>.md`

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
