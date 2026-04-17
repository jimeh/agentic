---
name: vuln-scan-orchestrator
description: Orchestrate a defensive vulnerability scan of a local software project by analyzing the repo at a high level, creating a bounded playbook of security-relevant focus areas, and coordinating sub-agents to review each area. Use this whenever the user asks for a security review, vulnerability scan, secure code audit, attack-surface analysis, or asks you to look for vulnerabilities in a codebase, even if they do not explicitly request a "playbook" or mention sub-agents.
---

# Vuln Scan Orchestrator

Perform a repo-level defensive security review by decomposing the target
project into a small number of meaningful focus areas and assigning each area to
one worker. Optimize for useful coverage, explicit ownership, and durable
artifacts under the target project's `security/` directory.

## Workflow

1. Inspect the target project at a high level.
2. Identify security-relevant subsystems and collapse them into disjoint focus
   areas.
3. Cap the area list at 6. Prefer 4-6 areas when the project is medium or
   large. Spawn at least 2 workers when there is more than 1 meaningful area.
4. Create a run id and write the playbook before spawning any worker.
5. Spawn one worker per focus area with explicit ownership and exact output
   paths.
6. Wait for all workers, then aggregate and deduplicate their findings.
7. Write the final summary and run manifest.

Use the current working directory as the target project root unless the user
explicitly points elsewhere.

## Artifact Layout

Write all outputs under the target project's top-level `security/` directory.
Use timestamped run directories only. Do not overwrite prior runs.

Required files for each run:

- `security/<run-id>/vuln-scan-playbook.md`
- `security/<run-id>/findings/<area-slug>.md`
- `security/<run-id>/vuln-scan-summary.md`
- `security/<run-id>/run-manifest.json`

Use a sortable UTC timestamp for `<run-id>`, for example
`2026-04-17T18-45-00Z`.

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

Merge adjacent areas when the repo is small or when several paths share the
same trust boundary. Avoid areas that overlap heavily.

For each area, define:

- area name
- rationale
- owned paths or subsystems
- excluded neighboring paths to avoid overlap
- vulnerability classes to check
- area-specific review hints
- worker report path

## Playbook Requirements

Write `vuln-scan-playbook.md` before spawning workers.

The playbook must contain:

- target root and run id
- concise repo overview
- the final bounded area list
- one section per area with:
  - rationale
  - owned paths
  - excluded paths
  - vulnerability classes to check
  - review hints
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

## Worker Instructions

Spawn one worker per area. Tell each worker that it is not alone in the
codebase and it must stay within its assigned area.

Each worker prompt should include:

- target project root
- run id
- area name
- owned paths or subsystems
- excluded paths or neighboring areas to avoid overlap
- vulnerability classes to check
- exact output file path

Each worker must:

1. Review only its assigned area, while following call paths into closely
   related files when necessary.
2. Focus on the listed vulnerability classes first.
3. Write its report to disk.
4. Return the same high-level summary back to the parent agent.

Each worker report must include:

- area name
- scope reviewed
- paths inspected
- bug classes checked
- credible findings
- notable non-findings or coverage notes
- confidence
- open questions or follow-ups

If there is no credible finding, say so explicitly and still include coverage
notes.

## Aggregation Rules

After workers finish:

- collect all returned summaries
- read the worker report files
- deduplicate overlapping findings
- separate credible findings from lower-confidence leads
- record areas with no credible finding
- list recommended next follow-ups

Write `vuln-scan-summary.md` with these sections:

- Target and Run
- Confirmed Credible Findings
- Lower-Confidence Leads
- Areas Reviewed With No Credible Finding
- Recommended Follow-Ups

Write `run-manifest.json` with:

- run id
- target root
- focus areas
- worker-to-report mapping
- worker completion status
- summary path

## Execution Guidance

Keep the workflow bounded and practical:

- do not create more than 6 areas
- do not create one worker per file
- prefer fewer, coherent areas over many tiny ones
- keep worker ownership disjoint
- preserve prior `security/<run-id>/` outputs

If the repo is too small for multiple meaningful areas, it is acceptable to use
1 worker. Otherwise, spawn at least 2.

Treat this as defensive analysis only. Do not produce exploit code. Keep the
reports focused on review findings, evidence, and remediation direction.
