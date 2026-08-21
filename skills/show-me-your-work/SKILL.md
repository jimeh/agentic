---
name: show-me-your-work
description: >-
  Keep an evidence-linked trail of material decisions during long or unattended
  work. Use when the user requests a decision trail or an owning workflow needs
  to preserve consequential pivots, risks, or blockers. Do not use as a
  transcript, command log, or validation ledger.
---

# Show Me Your Work

Record the decisions a reviewer needs to reconstruct how an outcome was reached,
without replaying the session. Keep one append-only TSV trail with evidence
pointers, separate from ordinary status updates and validation ledgers.

An explicit request for a trail, or an authorized caller workflow that invokes
this skill, permits a temporary decision file outside the repository. Use a
repository path, commit, upload, PR attachment, or external post only when the
user separately authorizes that destination or action.

## Start the Trail

Use the exact path the user supplies. Otherwise create a private file before the
first row, then report its absolute path:

```bash
trail="$(mktemp "${TMPDIR:-/tmp}/decision-trail.tsv.XXXXXX")"
chmod 0600 "$trail"
```

Use the bundled helper to append rows:

```bash
scripts/log.sh <trail.tsv> <phase> <decision> <rationale> <evidence> <outcome>
```

The columns are:

- `ts`: UTC ISO 8601 timestamp
- `phase`: the workstream or delivery phase
- `decision`: the concrete choice, pivot, reversal, or checkpoint
- `rationale`: why this option won under the observed constraints
- `evidence`: concise resolvable pointers such as a commit, PR, `file:line`,
  command result, screenshot, or artifact
- `outcome`: verified result, current state, or `open`/`inconclusive`

The helper writes the header, keeps cells single-line, and neutralizes
spreadsheet-formula prefixes. It refuses a nonempty file with the wrong header,
malformed existing rows, or no final line-feed byte. Do not put secrets,
credentials, private payloads, or large logs in the trail.

## Decide What Earns a Row

Record material moments:

- choosing between meaningfully different designs or scopes
- making an assumption that changes implementation or verification
- accepting or rejecting a one-way or hard-to-reverse action
- pivoting, reverting, or superseding an earlier approach
- invalidating evidence and deciding what must be rerun
- accepting a residual risk or explicit non-goal
- encountering or clearing a blocker that changes the delivery path
- completing a material phase with evidence that makes the next phase safe

Skip routine inspection, commands, obvious implementation steps, duplicate
status, and checks already captured in a revision-bound evidence ledger. One row
must express one crisp decision. If a decision changes, append a superseding
row; do not rewrite history.

## Audit Before Handback

Record prospectively during the current run. Never invent a missing decision,
infer one merely to make the trail complete, or search unrelated or private
transcripts. Retrospective reconstruction is allowed only from artifacts or
session material the user explicitly places in scope; preserve unsupported gaps
as `open`, `inconclusive`, or unknown.

Read the trail against the actual current session evidence:

- every row maps to an action or decision that happened
- every evidence pointer resolves and supports the stated outcome
- material pivots, reversals, accepted risks, and blockers are represented
- unresolved results remain marked `open` or `inconclusive`
- padding and claims already contradicted by later evidence are not presented as
  current truth

Preserve append-only history: correct an inaccurate row with a new row that
names what it supersedes. Summarize the few decisions that materially affect the
user's review, and flag weak evidence or unresolved risk. Report the trail path
and whether it is temporary, repository-local, committed, or uploaded.

When an owning workflow created the temporary trail without a user request to
inspect it, audit and summarize it, remove it before the final handback, then
report the deleted path and lifecycle. When the user explicitly asked for the
trail or its path, retain the temporary file for their inspection until they
request removal or the host cleans its temporary directory. State that it is not
durable and may disappear under host cleanup.

## Composition

An owning workflow decides whether a trail is warranted. This skill owns the
format and audit; the caller owns implementation, evidence sufficiency, reviews,
Git, PRs, and delivery. A validation ledger answers “what was proved at which
revision”; this trail answers “which material choices led here and why.” Do not
duplicate one into the other.
