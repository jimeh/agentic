---
name: vuln-scan-orchestrator
description: >-
  Run a requested defensive repository scan with scoped reviewers and
  verified findings, or maintain durable finding skips. Writes local scan
  artifacts; no exploits.
---

# Vuln Scan Orchestrator

Perform defensive analysis of the current repository unless the user names
another target. Do not produce exploit code. Preserve prior scan outputs.

For a request to ignore an existing finding, read
[skip-files.md](references/skip-files.md) and update the durable skip only; do
not start a scan. For a scan, read that reference and
[scan-contract.md](references/scan-contract.md) before planning.

## Scan workflow

1. Inspect the project and existing `security/vuln-scan/skips/` notes. Match
   skips by behavior, paths, and rationale, not title alone. Stale or partial
   matches become `skip needs review` and receive normal verification.
2. Derive disjoint areas from trust boundaries. Cap at six; prefer four to six
   for larger projects. Use at least two reviewers when multiple meaningful
   areas exist, or one for a small project with a single area.
3. Create a sortable UTC run directory under `security/vuln-scan/`. Write the
   playbook and initialize the summary and verified-results files before
   assigning work. The scan contract defines exact paths and report fields.
4. Assign one reviewer per area with owned and excluded paths, vulnerability
   classes, relevant skip rationale, and one exact report path. Workers may
   follow necessary adjacent call paths but must not edit other reports.
5. Aggregate all reports, deduplicate, and assign stable run-local finding IDs.
   Never renumber after verification begins, including rejected findings.
6. Verify every non-skipped candidate against source, context, tests, and design
   intent. The parent normally verifies sequentially; scoped verifiers are
   appropriate for large scans or explicitly requested extra rigor.
7. The parent alone updates the summary and appends confirmed actionable
   findings to verified results. Record rejections, demotions, skips, uncertain
   leads, and coverage separately. Verified results must be a self-contained fix
   handoff. Finish the run manifest and report coverage limits.

## Worker boundaries

Start workers without parent conversation history: `fork_turns: "none"` in
Codex, or the host's fresh-context equivalent. Supply the target root, task,
owned paths, evidence pointers, constraints, output contract, and no-nested-
delegation instruction. Verifiers receive candidate evidence without unrelated
parent conclusions. Never enable full-context inheritance to resolve a spawn
parameter error.

Correct an incompatible spawn once. If workers remain unavailable, continue with
a bounded local pass and report the lost independent coverage. Keep all summary
and verified-results writes serialized through the parent.
