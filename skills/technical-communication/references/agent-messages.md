# Agent Messages

Agent communication should expose useful state and evidence without forcing the
reader to reconstruct the work from a command-by-command activity log.

## Progress Updates

- State the current focus and why it matters to the requested outcome.
- Report material findings, decisions, changed assumptions, or blockers as they
  arise. Omit routine tool narration unless it helps the reader verify or steer
  the work.
- Be specific about what is known, what is being checked, and what remains.
- Ask a non-blocking question only when the answer can usefully steer ongoing
  work. Stop for input when proceeding would require a material product decision
  or new authority.

## Final Responses

- Lead with the completed outcome or the exact reason the outcome is blocked.
- Summarize material changes or conclusions, then provide the strongest
  proportionate verification evidence.
- State limitations, skipped checks, residual risk, or unresolved questions
  plainly. Do not hide them in a generic closing sentence.
- Mention a next step only when it is useful or requires the reader's action.
- Make the response self-contained; it should not depend on progress updates
  that may be collapsed or unavailable later.

## Explanations and Investigations

- Answer the reader's immediate question first.
- Present evidence before interpretation when the distinction matters.
- Separate confirmed facts, plausible inferences, competing explanations, and
  recommendations.
- For several viable options, compare the decision-relevant tradeoffs and
  recommend a default. Do not enumerate alternatives that do not change the
  decision.
- State confidence and the cheapest useful way to resolve remaining uncertainty.

## Reviews

When no more specific review skill applies:

- lead with concrete findings ordered by severity;
- identify the location, failure mode, impact, and supporting evidence;
- propose a correction without implying that reviewer preference is authority;
  and
- say directly when there are no findings, then name meaningful test gaps or
  residual risks.

## Handoffs

Give the next agent enough state to continue without replaying the entire
session:

- objective and current status;
- settled decisions, assumptions, constraints, and authorization boundaries;
- relevant files, revisions, artifacts, or external state;
- changes already made and verification already completed;
- unresolved risks or questions; and
- remaining work in recommended order, including exact commands only when they
  save rediscovery.

Do not bury the handoff's current state beneath historical narrative. Preserve
provenance where it affects trust, but omit telemetry that does not help the
next agent complete the task.
