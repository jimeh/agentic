---
name: codex-analysis
description: >-
  Ask Codex CLI / gpt-5.5 to perform read-only analysis, investigation, or data
  extraction over large context such as large logs, large PDFs, implementation
  specs, broad code searches, generated artifacts, datasets, traces, or
  multi-file evidence. Use when Claude needs Codex's throughput for
  non-destructive reading, summarization, comparison, extraction, triage, or
  root-cause investigation. Do not use for code edits, code review,
  architecture, product decisions, UX decisions, final judgement, or runtime GUI
  verification.
---

# Codex Analysis

Use Codex for read-only work where throughput matters. Claude stays responsible
for deciding what the evidence means and what to do next.

This skill fills the gap between code review, implementation, and computer use:
it is for analysis and investigation, not patching or final judgement.

## Routing Checklist

Use this skill when several answers are yes:

1. Is the task read-only?
2. Is the input large enough that Codex throughput helps?
3. Is the desired output extraction, summary, comparison, triage, or evidence?
4. Can the result be checked against source material?
5. Would direct Claude reasoning spend too much context on mechanical reading?

Use another skill when the job is implementation, code review, or GUI/runtime
observation.

## Workflow

1. Identify the analysis target: files, logs, docs, PDFs, specs, commits,
   generated output, or search space.
2. Define the question Codex should answer.
3. Create a temporary artifact directory for the prompt and report.
4. Run Codex in read-only mode.
5. Read the report and spot-check important claims against the source.
6. Return the useful evidence, confidence, and next recommended step.

## Command Shape

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-analysis.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
REPORT="$ARTIFACT_DIR/report.md"
```

Run Codex read-only:

```bash
codex exec \
  -C "$PWD" \
  -s read-only \
  -o "$REPORT" \
  - < "$PROMPT"
```

No extra access flags are needed: the read-only sandbox can read the whole disk,
and `-o` writes the report from outside the sandbox. (`--add-dir` grants write
access; it has no place in read-only analysis.)

## Prompting Strategy

Prompts should be short and specific. Ask a question; do not ask Codex to
explore aimlessly.

Use this shape:

```text
Analyze this read-only target.

Repository: <absolute repo path>
Target: <files/logs/docs/specs/search space>
Question: <specific question to answer>

Constraints:
- Do not edit files.
- Prefer evidence with file paths, line numbers, timestamps, or excerpts.
- Say when evidence is missing or inconclusive.

Report:
- answer
- supporting evidence
- uncertainty or gaps
- suggested next step
```

Good tasks:

- Summarize a large log and identify likely failure causes.
- Extract requirements from a long implementation spec.
- Compare generated output against expected behavior.
- Search a broad code area for a pattern and report examples.
- Triage a large test failure report.

Bad tasks:

- Decide architecture
- Write or modify code
- Review a patch for correctness
- Operate a browser or desktop app
- Make product, UX, or copy decisions

## Reporting Back

Treat Codex output as gathered evidence. Verify important claims before using
them as conclusions.

Report:

- What Codex analyzed
- Answer or summary
- Key evidence
- Uncertainty or gaps
- Recommended next step

If Codex cannot access the target, report what was missing and whether Claude
can continue with available context.
