# Skill routing scenarios

Use these cases when revising workflow selection. Evaluate the relevant skill
entry points with only the task facts, without supplying expected answers to an
independent evaluator. Do not perform GitHub mutations during scenario checks.

| Request and context                                                                                          | Expected behavior                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small fix, file PR, and babysit                                                                              | Parent implementation, commit, file-pr, babysit-pr; no added reviewers.                                                                            |
| Review this change; current session authored it                                                              | review-code selects one fresh native reviewer with no parent history.                                                                              |
| Review this change; current session did not author it                                                        | review-code performs direct inspection.                                                                                                            |
| Explicit Codex CLI review                                                                                    | codex-review executes one fresh CLI reviewer using review-code's contract.                                                                         |
| Codex review requested inside T3 Code from a Claude thread                                                   | codex-review runs one read-only Codex child task through t3-delegation; no headless CLI.                                                           |
| Explicit Codex CLI review inside T3 Code                                                                     | codex-review uses codex-headless because the user named the CLI.                                                                                   |
| Direct request for a Codex child task inside T3 Code                                                         | The matching codex-* skill when one fits, otherwise t3-delegation loaded before delegate_task; model and effort set explicitly.                    |
| Dual review inside T3 Code from a Claude thread                                                              | Fresh native Claude reviewer and a Codex child task, started together; no headless CLI.                                                            |
| Follow-up round for a reviewer that ran as a T3 child task                                                   | New child task carrying the prior brief, findings, and revision boundaries; the child thread is not messaged.                                      |
| Codex implementation inside T3 Code, clean thread worktree                                                   | codex-implementation runs one Codex child task with exclusive ownership of the checkout.                                                           |
| Codex implementation inside T3 Code needing isolation or concurrency                                         | The parent creates each worktree and one Codex child task works in it by absolute path; no headless CLI.                                           |
| Codex computer use inside T3 Code                                                                            | codex-computer-use keeps codex-headless.                                                                                                           |
| Worker requested inside T3 Code from a thread in approval-required or auto-accept-edits                      | Tell the user the child would wait on their approvals and offer the headless CLI; no silent delegation.                                            |
| Worker skill outside T3 Code                                                                                 | Headless CLI transport, unchanged.                                                                                                                 |
| Explicit ship-feature-pr                                                                                     | Full delivery with Codex and Claude review; continue corrections according to invalidated risk.                                                    |
| Only request CodeRabbit on an existing PR                                                                    | Trigger, wait, inspect, and report; no independent local reviewers or unsolicited fixes and thread mutations.                                      |
| Review or dual review a colleague's PR; no posting grant                                                     | review-pr runs dual-review and reports a verdict with classified findings; nothing posted.                                                         |
| Review the user's own PR                                                                                     | review-code, plus dual-review only if requested; no verdict or approval.                                                                           |
| Review a colleague's PR the user has taken over                                                              | Treated as the user's own PR; no review-pr verdict or approval.                                                                                    |
| Review a colleague's PR and approve if everything is fine; verdict approve                                   | review-pr submits an approval with optional notes collapsed and follow-ups visible.                                                                |
| Colleague's PR; "submit your review" without mentioning approval; verdict approve                            | review-pr posts any optional and follow-up notes as a comment review and reports the PR ready to approve.                                          |
| Colleague's PR; "submit your review" without mentioning approval; verdict request changes                    | review-pr submits request changes with the blocking findings inline.                                                                               |
| Colleague's PR; "post whatever the outcome"; verdict approve                                                 | review-pr submits an approval.                                                                                                                     |
| Colleague's PR; a defect gives wrong billing totals only for an uncommon supported currency                  | Blocking; verdict request changes.                                                                                                                 |
| Follow-up round in a thread whose earlier request granted posting                                            | Report only; the earlier grant does not carry over.                                                                                                |
| Follow-up round with a posting grant finds a new optional item and a new follow-up in unchanged code         | Drop the optional item; report the follow-up to the user without posting it.                                                                       |
| Colleague's PR with CI pending or failing                                                                    | No waiting; report check state; verdict unaffected.                                                                                                |
| After a report, post selected feedback on a colleague's PR                                                   | Post only the selected items as one review with GitHub attribution; request changes if one blocks, otherwise comment; no babysit-pr.               |
| Babysit a colleague's PR the user has taken over                                                             | babysit-pr operates as it does on the user's own PR, including any dual review; no review-pr.                                                      |
| Reword the description of a colleague's PR                                                                   | write-pr-copy with jimeh's footer before bot-managed sections; other attribution unchanged.                                                        |
| Review of the second correction round finds material defects in original code that no correction caused      | Converging; run another round.                                                                                                                     |
| Review of the second correction round finds nothing material                                                 | Diminishing; fix none of the findings, request no further review of those corrections, and report them.                                            |
| Two consecutive reviews find correction-caused defects in one component; the latest is material              | Churning; rethink the component within scope, make one consolidated correction, and have the required reviewers review the whole component afresh. |
| Two corrections in a row each break untouched original code in one component                                 | Churning, because each finding traces to a correction.                                                                                             |
| Internal rounds end as Diminishing; a required external reviewer has not run                                 | The external review still runs once on the accepted candidate.                                                                                     |
| User allows eight correction rounds; the second-round review finds nothing material                          | Diminishing still applies; the budget replaces only the fifth-round ask.                                                                           |
| Churning under direct babysit-pr where the workflow requires no reviewer                                     | Rethink, verify it directly, and say so in the report; no added reviewer.                                                                          |
| Rethink of a churning component would change scope, behavior, or a requirement, or accept a known limitation | Ask the user before proceeding.                                                                                                                    |
| Fifth correction round would be needed; no user budget                                                       | Leave the PR safe and ask the user, reporting the outcome and options.                                                                             |
| Second-round agent reviewer suggests a cheap hardening change with no failure path                           | Report it as residual risk or follow-up work; no fix.                                                                                              |
| Second-round agent reviewer reports an untested correction branch or a breached repository rule              | Material when review-code would accept it; fix it.                                                                                                 |
| Review after the second correction round holds bot nits and a human reviewer's rename request                | Diminishing covers the bot findings only; the human's request still gets a fix or a reply.                                                         |
| Follow-up review round requested                                                                             | Brief verifies prior findings and correction defects against unchanged requirements; findings carry their origin.                                  |
| User supplied a correction limit, now exhausted                                                              | Stop at that explicit limit and report the concrete remaining work.                                                                                |
| Delegated reviewer loads review-code                                                                         | Review directly; do not spawn another reviewer.                                                                                                    |
| Host defaults to full history but supports fork_turns                                                        | Explicitly set fork_turns="none" and supply a focused brief.                                                                                       |
| Native host cannot isolate context                                                                           | Fresh worker through the matching worker skill, or parent execution.                                                                               |
| Worker asked to launch another model without parent authority                                                | Decline nested delegation and report the scope boundary.                                                                                           |
| High-stakes review or hard task; user named no model                                                         | Opus 5.5 workers; Fable is not selected.                                                                                                           |
| User names Fable for one review, then delegates other work                                                   | Fable for the named review only; Opus 5.5 for the later delegation.                                                                                |

## Verification evidence

The September 12, 2026 forward-test used a fresh native evaluator with
`fork_turns="none"`, no file ownership, and no mutation or further delegation.
It inspected nine routing cases and identified two ambiguities: a new head SHA
could appear to force renewed dual review despite adequate continuation
coverage, and a CodeRabbit-only request could imply thread mutations. Both entry
points were clarified. The remaining budget, fallback, and nesting cases were
checked manually. This tests interpretation, not live end-to-end agent execution
or a mechanical host guarantee.

Forward-tests of the GitHub attribution rule on October 2 and 3, 2026 used the
same constraints. They covered the three colleague-PR rows, dictated and
composed comments, a commit and push, revising descriptions with existing
attribution and bot-managed sections, and filing a PR and an issue. The last run
checked the global rules alone, without skills, and then with skills available.
Every case reached the expected skill and attribution. The runs exposed
ambiguities in footer placement below another person's attribution, blank lines
around the footer, and moved heads before posting review feedback, which the
global rule and review-code now address. An "Edited" footer variant caused
repeated ambiguity and was dropped. The two placement fixes from the last run
have not been re-run through an evaluator.

The T3 Code transport rows were checked on October 5, 2026 against T3 Code
server 0.0.46-nightly.20261005 from a Claude thread in `full-access` mode. Probe
child tasks, run before and between the review rounds below, established the
checkout, sandbox, approval, network, tool, and skill facts recorded in the
[tooling notes](tooling-notes.md).

A dual review of the pull request that introduced `t3-delegation` ran as that
skill then prescribed: a fresh native Claude reviewer and a Codex child task
with the `review` role, default interaction mode, inherited runtime mode, and
the model and effort from the Codex configuration, started together with the
Codex task asynchronous. T3 woke the parent when the child finished. Both
reviewers returned complete reports and left the checkout unchanged. Both traced
each T3 Code row that existed then to its stated outcome, the Claude reviewer on
condition that the agent recognizes it is inside T3 Code. Their findings led to
the checkout snapshot, the runtime mode rule, and the detection sentence in each
Transport section.

A follow-up round then verified those corrections, which exercised the follow-up
row. The Claude reviewer was resumed natively. The Codex reviewer was a new
child task carrying the brief and accepted findings, run in `auto` without
network access as the runtime mode rule now prescribes for local work. Both
confirmed the corrections, and the checkout snapshot was unchanged afterwards.

Two fresh top-level threads then tested unprompted selection, one Claude and one
Codex, each in `full-access` and each asked only to have the other engine review
the latest commit. A setup note told them to read the skills and global rules
from the checkout under review, because the installed copies predated the
change. Judged from their recorded tool calls, both read the provider review
skill and `t3-delegation`, took a checkout snapshot, and started one child task
with an explicit model and effort, the `review` role, default interaction mode,
and `auto`, asynchronously. Both were woken by the child, verified its findings,
and confirmed the snapshot. Neither used a headless CLI.

Separate top-level threads in `auto`, `auto-accept-edits`, and
`approval-required` established how a parent's mode limits its children; those
were runtime probes, not scenario evaluations, so the restricted-parent row and
the direct-request row have not been evaluated by a fresh agent.

Three implementation child tasks then ran at once in `auto`, each in its own
parent-created worktree, making a one-file edit and running the project's
checks. Each changed only its own worktree; the tooling notes record which
checks ran for each provider.

Not exercised: discovery of the skills from their installed descriptions alone,
a substantial implementation child task, and the headless CLI as the alternative
for a restricted parent.

The convergence rows were checked on October 6, 2026 by a fresh native evaluator
with no parent history, no file ownership, and no mutation or further
delegation. It read the review and delivery skills without this table and
answered twelve cases covering the three outcomes, a cheap unverified concern, a
rethink that drops a stated feature, the fifth-round ask, an exhausted user
budget, a review loop outside babysit-pr, repeated CI fixes, a human reviewer's
request, a follow-up brief, and correction rounds before the ship-feature-pr
handoff. Nine reached the intended behavior. The other three exposed that
review-code and babysit-pr counted rounds differently, that the outcomes
overlapped without a precedence, and that a rethink's whole-component review
conflicted with delta-scoped follow-ups. One consolidated correction addressed
those, and the resumed evaluator confirmed them resolved. It also found two
conflicts in the corrected text, on dual-review briefs for a rethought component
and on "fix nothing further" beside a human request. Both were fixed and checked
by inspection, not re-run. Still open: an agent that reviews outside babysit-pr
reaches Check Convergence only after its second correction batch, so it does not
see the materiality rule before making that batch.

A dual review of that pull request, a Codex child task and a fresh native Claude
reviewer on one brief, then found five gaps that no scenario had covered. The
Diminishing outcome could cancel a required review that had not run. The
materiality rule was narrower than review-code's finding standard. Churning
tested only where a finding lay, not whether a correction caused it. An explicit
budget could be read as switching the rules off. And a rethink's review named no
reviewer when the workflow required none. One consolidated correction addressed
them and added a row for each.

Both reviewers then verified the corrections and judged the five gaps resolved.
They found two defects in the corrected text: a converging row that the Churning
change had made imprecise, and a Diminishing rewording that again covered a
human reviewer's request. The section now states once which findings it covers,
and both cases have rows. The corrected text has not been re-run through a
scenario evaluator.

The installer test uses the real selection and cleanup policy with synthetic
roots and homes. It checks both worker families, directional exceptions,
disabled-link cleanup, retained Vercel guidance, and preservation of unmanaged
content. Runner tests check emitted Claude delegation denials. Neither test
invokes a live model or updates installed user configuration.

The `review-pr` rows were checked on October 6, 2026 by two fresh native
evaluators with no file ownership, GitHub access, or further delegation. Their
scenarios came from colleague-PR threads between September 2 and October 6. The
first run found that generic "submit your review" requests matched no grant,
that the `review-code` comment default competed with the grant rules, that the
blocking threshold had no floor, and that seeding follow-up reviewers conflicted
with `dual-review`. All four were corrected. The second run routed every case as
expected; its remaining notes on classification boundaries, root-cause
deduplication, and comment-review wording were then tightened without a third
run. On October 8, 2026, after the grant, blocking-threshold, and taken-over
changes, a third fresh evaluator routed all fifteen of its scenarios as
intended. Its wording findings on requests that match no grant, head movement
before a selection is posted, selection bodies, an earlier change request that
stays in effect, and taken-over routing were corrected without a fourth run.
This tests interpretation, not live end-to-end reviews.
