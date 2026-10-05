# Skill routing scenarios

Use these cases when revising workflow selection. Evaluate the relevant skill
entry points with only the task facts, without supplying expected answers to an
independent evaluator. Do not perform GitHub mutations during scenario checks.

| Request and context                                                                     | Expected behavior                                                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Small fix, file PR, and babysit                                                         | Parent implementation, commit, file-pr, babysit-pr; no added reviewers.                                                         |
| Review this change; current session authored it                                         | review-code selects one fresh native reviewer with no parent history.                                                           |
| Review this change; current session did not author it                                   | review-code performs direct inspection.                                                                                         |
| Explicit Codex CLI review                                                               | codex-review executes one fresh CLI reviewer using review-code's contract.                                                      |
| Codex review requested inside T3 Code from a Claude thread                              | codex-review runs one read-only Codex child task through t3-delegation; no headless CLI.                                        |
| Explicit Codex CLI review inside T3 Code                                                | codex-review uses codex-headless because the user named the CLI.                                                                |
| Direct request for a Codex child task inside T3 Code                                    | The matching codex-* skill when one fits, otherwise t3-delegation loaded before delegate_task; model and effort set explicitly. |
| Dual review inside T3 Code from a Claude thread                                         | Fresh native Claude reviewer and a Codex child task, started together; no headless CLI.                                         |
| Follow-up round for a reviewer that ran as a T3 child task                              | New child task carrying the prior brief, findings, and revision boundaries; the child thread is not messaged.                   |
| Codex implementation inside T3 Code, clean thread worktree                              | codex-implementation runs one Codex child task with exclusive ownership of the checkout.                                        |
| Codex implementation inside T3 Code needing isolation or concurrency                    | The parent creates each worktree and one Codex child task works in it by absolute path; no headless CLI.                        |
| Codex computer use inside T3 Code                                                       | codex-computer-use keeps codex-headless.                                                                                        |
| Worker requested inside T3 Code from a thread in approval-required or auto-accept-edits | Tell the user the child would wait on their approvals and offer the headless CLI; no silent delegation.                         |
| Worker skill outside T3 Code                                                            | Headless CLI transport, unchanged.                                                                                              |
| Explicit ship-feature-pr                                                                | Full delivery with Codex and Claude review; continue corrections according to invalidated risk.                                 |
| Only request CodeRabbit on an existing PR                                               | Trigger, wait, inspect, and report; no independent local reviewers or unsolicited fixes and thread mutations.                   |
| Dual review a colleague's PR, then post selected feedback                               | dual-review reports only; after the user selects feedback, post it as a review with GitHub attribution; no babysit-pr.          |
| Babysit a colleague's PR the user has taken over                                        | babysit-pr operates as it does on the user's own PR.                                                                            |
| Reword the description of a colleague's PR                                              | write-pr-copy with jimeh's footer before bot-managed sections; other attribution unchanged.                                     |
| Third verified correction; no user budget                                               | Continue authorized stewardship while making progress.                                                                          |
| User supplied a correction limit, now exhausted                                         | Stop at that explicit limit and report the concrete remaining work.                                                             |
| Delegated reviewer loads review-code                                                    | Review directly; do not spawn another reviewer.                                                                                 |
| Host defaults to full history but supports fork_turns                                   | Explicitly set fork_turns="none" and supply a focused brief.                                                                    |
| Native host cannot isolate context                                                      | Fresh worker through the matching worker skill, or parent execution.                                                            |
| Worker asked to launch another model without parent authority                           | Decline nested delegation and report the scope boundary.                                                                        |
| High-stakes review or hard task; user named no model                                    | Opus 5.5 workers; Fable is not selected.                                                                                        |
| User names Fable for one review, then delegates other work                              | Fable for the named review only; Opus 5.5 for the later delegation.                                                             |

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

The installer test uses the real selection and cleanup policy with synthetic
roots and homes. It checks both worker families, directional exceptions,
disabled-link cleanup, retained Vercel guidance, and preservation of unmanaged
content. Runner tests check emitted Claude delegation denials. Neither test
invokes a live model or updates installed user configuration.
