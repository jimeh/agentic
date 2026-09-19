# PR condition evaluation

`agent-pr-monitor evaluate` observes a PR once and evaluates explicit
conditions. `wait --until` repeats the same evaluation, pinning the initial head
and returning when the goal is met or the caller needs to inspect a change.
Neither command reads, locks, or advances the existing change-based wait cursor.
Plain `snapshot` and `wait` retain their existing behavior and artifacts.

The agent-config installer links `agent-pr-monitor` into `~/.local/bin`. Run
these commands from any project checkout; they do not require an Agentic working
directory.

```bash
# One-shot probes. Repeat --until to require all conditions.
agent-pr-monitor evaluate "$PR_URL" --until checks-pass --checks required
agent-pr-monitor evaluate "$PR_URL" --until checks-finished --checks build
agent-pr-monitor evaluate "$PR_URL" --until review-finished \
  --reviewer coderabbitai

# Wait on a composed, exact-head goal.
agent-pr-monitor wait "$PR_URL" --until checks-pass \
  --until review-approved --reviewer coderabbitai \
  --until threads-resolved --until non-draft --until mergeable

# New or edited feedback since a request, with an optional author filter.
agent-pr-monitor evaluate "$PR_URL" --until feedback-received \
  --since 2026-09-19T12:00:00Z --reviewer coderabbitai
```

## Conditions

| Condition           | Evidence required                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `checks-finished`   | Every selected check exists and has a terminal outcome. Failures, skipped and neutral outcomes count as finished.                       |
| `checks-pass`       | Every selected check exists and concluded `SUCCESS`. Skipped and neutral do not count as success.                                       |
| `review-finished`   | Selected reviewer submitted `APPROVED`, `CHANGES_REQUESTED`, or `COMMENTED` on this head; the latest submitted review is not dismissed. |
| `review-approved`   | Selected reviewer's latest explicit decision on this head is `APPROVED`; a later dismissal invalidates it.                              |
| `threads-resolved`  | All threads are resolved. `--ignore-outdated` explicitly excludes outdated threads.                                                     |
| `feedback-received` | Feedback was created or edited strictly after `--since`. This requires a timestamp, and does not imply the content is actionable.       |
| `non-draft`         | GitHub reports the PR is not a draft.                                                                                                   |
| `mergeable`         | GitHub reports `MERGEABLE`. This describes conflict status, not whether all merge policies are satisfied.                               |
| `merged` / `closed` | GitHub reports that exact lifecycle state; merged is distinct from closed without merging.                                              |

`--checks required` is the default. It combines classic branch protection with
all active branch ruleset pages and respects required GitHub App identities.
Unavailable or unsupported metadata, including required-workflow rules that do
not expose check names, produces unknown. An app-bound requirement with a
same-name commit status also returns unknown: the status observation does not
expose its app identity, even when a matching check run passes. GitHub requires
[both a check and a commit status with the same required name to pass](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
The monitor keeps the app restriction and returns control for inspection. An
empty selected set never proves success. `--checks all` covers only registered
checks; it cannot prove that an expected job has appeared. Repeat
`--checks NAME` to specify exact expected names. Required/all scopes cannot be
mixed with names.

Review conditions require `--reviewer LOGIN`. The `[bot]` suffix is optional.
`--review-status complete|approved` is a shorthand for adding the corresponding
review condition. `--since` filters reviews by their submission timestamp,
strictly after the baseline. Feedback uses its update timestamp. Review ordering
uses submission time, so editing an older review does not supersede a newer one.
New walkthrough comments and later `COMMENTED` reviews do not revoke an existing
approval. A later `CHANGES_REQUESTED` or `DISMISSED` review prevents approval; a
subsequent `APPROVED` restores it. A latest dismissed review does not satisfy
`review-finished` either. Old-head reviews never satisfy either condition.

These conditions describe submitted GitHub metadata, not a bot's current work
queue. Pending drafts cannot establish completion and do not revoke an earlier
approval. Comments cannot establish completion, approval, or commit coverage.
The monitor does not interpret text to identify a new review attempt, skipped
review, rate limit, or failure. To require a submission after a new request,
pass `--since` with that request's timestamp. Thread resolution does not grant
approval.

Use `--head FULL_SHA` to pin a particular revision, otherwise the first
observation pins it. Goal waits return `head_changed` instead of silently
following a push. Before reporting goal completion, a wait takes another full
observation and re-evaluates every condition. A one-shot probe intentionally
performs one observation and reports its timestamp; it is not a continuing
guarantee.

## Output and waiting

Each invocation prints one JSON result with `kind`, `url`, `headSha`,
`observedAt`, the normalized `goal`, and `conditions` with reasons and evidence
IDs. Each condition has status `met`, `not_met`, or `unknown`. For conjunctions,
a known false condition makes `satisfied` false; otherwise any unknown makes it
null. All met makes it true. Inspect individual conditions when both false and
unknown occur.

One-shot exit codes are 0 for met, 3 for not met, and 4 for unknown. Goal waits
return 0 for `goal_reached`, 3 for `attention_required` or `head_changed`, and 2
for timeout. Both return 1 for errors, 130 for SIGINT, and 143 for SIGTERM.
Timeouts, errors, head changes and cancellation never report satisfied. These
nonzero codes are expected outcomes; Mise may also print its task-failed footer.

A failed selected check for a checks-pass goal, requested changes or dismissal
that prevents the goal, or an unknown condition returns control to the caller.
Pending checks and absent submitted reviews keep waiting. New or edited feedback
during an unmet wait returns `attention_required`, including apparent progress
messages; the caller interprets their content. `--since` also exposes feedback
updated after the baseline on the first observation. Closed PRs return control
when remaining goals are unmet. A satisfied goal takes precedence over feedback
notifications and still requires the final confirmation observation.

The existing `--interval`, `--initial-delay`, and `--timeout` apply to goal
waits. `evaluate` does not accept an initial delay. Transient GitHub observation
errors back off in waits; one-shot probes report them immediately.
Required-metadata errors remain unknown rather than falling back to incomplete
requirements. `--state-file` has no effect on goal calls. They do not save
artifacts or comment bodies; redirect the JSON result when durable probe
evidence is needed.

## Development and verification

Inside the Agentic repository, `mise run pr-monitor -- ...` runs the local
source during development. Installed agents use `agent-pr-monitor` directly.

`mise run test:pr-monitor` exercises structured review precedence, synthetic
GitHub pagination and required-check discovery, actual CLI exit behavior, legacy
cursor isolation, head changes, cancellation and confirmation races. Tests never
need a real API key. `evaluateGoal` accepts an in-memory observation, so it can
be evaluated against several goals without additional GitHub reads.
