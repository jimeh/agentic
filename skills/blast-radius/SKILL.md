---
name: blast-radius
description: >-
  Audit downstream and hidden risk beyond a code change's visible diff. Use when
  the user asks for blast radius, affected consumers, hidden breakage, or proof
  that a deceptively small change is safe. Ordinary code review and
  implementation use their own workflows.
---

# Blast Radius

Trace the behavior a change can affect outside its obvious files and callers.
Return confirmed risks, cleared concerns, and the strongest proportionate proof
for the assumptions that make the change safe.

Keep the repository and external systems read-only. A request to check blast
radius authorizes scoped temporary artifacts outside the repository and safe
local or explicitly scoped development executions needed to test a safety claim.
It does not authorize persistent tests, repository edits, production or
live-system access, durable instrumentation, commits, pushes, or posts. Obtain
separate authorization for those actions.

Use `why` when historical rationale could reveal a constraint or rejected
alternative. Use the code-review workflow when the primary outcome is a full
diff review rather than downstream-risk analysis. Authoritative external-source
inspection needed for this audit stays inline and read-only. Do not invoke the
report-writing `research` workflow unless the user separately requests and
authorizes a durable research artifact.

## Investigate

1. Pin the exact change. Read the full diff, requirements, changed symbols, and
   relevant surrounding code. State assumptions when the proposed change does
   not yet exist as an immutable revision.
2. Describe the behavioral delta, including effects the syntax hides: timing,
   ordering, ownership, retries, caching, serialization, lifecycle, errors,
   permissions, and cleanup.
3. Follow the affected contracts beyond direct callers. Inspect configured
   dependency versions and local patches, generated or serialized formats,
   database and API boundaries, other languages or processes consuming the same
   data, asynchronous work, feature flags, and deployment compatibility. Search
   for absences as well as matches; do not invent consumers.
4. Identify the one or two safety claims on which most of the change depends.
   Phrase each so it could be disproved. Avoid expanding a single load-bearing
   fact into a long list of speculative risks.
5. Test each material claim with the cheapest strong evidence available. Prefer
   existing focused tests or commands. When they cannot answer it, use a small
   temporary script or reproducer that calls the real shipped boundary. Keep it
   outside the repository, redact secrets, and remove it after capturing the
   result. Do not turn an audit into an implementation.
6. Rank remaining risks by realistic likelihood, impact, and confidence. Clear a
   concern only when the evidence closes its failure path. Re-read the live
   target at the end and mark the audit stale if it moved.

For wide changes, parallel independent analysis can improve coverage when the
active workflow authorizes it. It is not a fixed requirement and does not
replace direct evidence.

## Evidence Strength

The levels are cumulative. Report the highest level for which the claim also
satisfies every preceding criterion:

1. **Located**: the controlling source, contract, consumer boundary, or concrete
   absence search was identified and cited; this alone does not establish that
   the safety claim is true.
2. **Traced**: the concrete failure path was followed and shown not to reach.
3. **Executed**: after the failure path was traced, a focused script or test
   exercised the real boundary and would fail if the claim were false.
4. **Observed end to end**: after satisfying **Executed**, the same falsifiable
   behavior was reproduced in the explicitly scoped running application or
   environment.

Do not round evidence upward. Keep every material claim below **Executed**
explicitly unproven. When stronger execution would be disproportionate or
unsafe, state that reason without promoting the claim.

## Report

Answer inline unless the user requested another artifact. Lead with the safety
claim and its proof, then provide:

- the exact change and behavioral delta examined
- confirmed risks, each with trigger, impact, likelihood, confidence, and
  precise evidence
- cleared concerns and the evidence that closed them
- unproven assumptions and important coverage gaps
- the cheapest pre-merge check that would catch the most credible failure

Do not paste large logs. Quote only the lines that carry the signal and redact
secrets or private data.

## Source

Adapted from Cursor's pinned
[`pstack` blast-radius skill](https://github.com/cursor/plugins/blob/60c641e4fad674784b30abcf9f8915dea39df38d/pstack/skills/blast-radius/SKILL.md).
