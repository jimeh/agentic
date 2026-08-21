---
name: why
description: >-
  Trace repository history and available evidence to explain why code or a
  technical decision exists. Use for historical rationale, constraints,
  thresholds, rejected alternatives, or explanation-only rebase conflicts.
  Current behavior and active bug diagnosis use other workflows.
---

# Why

Explain the historical intent behind repository code and technical decisions.
Keep the entire investigation read-only: do not create reports, edit files,
apply fixes, commit, push, post comments, or mutate external systems.

This skill owns repository archaeology. Use ordinary code inspection to explain
current mechanics. Use `research` for broad external primary-source research
saved as a Markdown report, and `domain-modeling` for terminology decisions or
writes to `CONTEXT.md` and ADRs.

## Investigation

1. Anchor the question in the current repository. Identify the relevant paths,
   symbols, and line ranges, and state the interpretation if the target is
   ambiguous. Comments and tests can establish explicit constraints, but code
   shape by itself proves mechanics, not intent.
2. Trace source control before widening the search. Use focused tools such as
   `git blame`, `git log --follow`, `git log -S`, and `git log -G`. Read the
   full commit messages and diffs that matter, then inspect linked pull
   requests, review threads, and issues when available.
3. Follow evidence-relevant leads into already available and authorized tickets,
   design documents, chat, incident records, or telemetry. Search only sources
   that could answer the question. Never inspect production, live databases, or
   live operational systems without explicit authorization.
4. Test the emerging explanation against the record. Treat the user's proposed
   explanation as a hypothesis. Look for later changes, reversions, conflicting
   accounts, and evidence that a constraint expired or moved.

Parallel evidence searches are optional when the question is broad and the
active workflow permits them. Do not enumerate integrations or turn the
investigation into a fixed source-count exercise.

## Answer

Answer inline at the depth the evidence supports. Cite precise commit hashes,
pull requests, issues, documents, review comments, or code comments so the user
can verify each material claim. Separate:

- direct evidence of intent
- supported inference, with the evidence chain and calibrated hedging
- contradictions or competing explanations
- unknowns and important evidence gaps

Do not smooth gaps into a confident story. If the record does not establish a
reason, say so.

For a mixed investigate-then-fix request, complete the read-only investigation
before mutation. Present it as a separate checkpoint when the user asked to
discuss first; otherwise hand its evidence and constraints directly to the
authorized implementation workflow. When useful, summarize `Preserve`, `Change`,
`Avoid`, and `Risk` constraints.
