# Skill routing scenarios

Use these cases when revising workflow selection. Evaluate the relevant skill
entry points with only the task facts, without supplying expected answers to an
independent evaluator. Do not perform GitHub mutations during scenario checks.

| Request and context                                           | Expected behavior                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Small fix, file PR, and babysit                               | Parent implementation, commit, file-pr, babysit-pr; no added reviewers.                                                |
| Review this change; current session authored it               | review-code selects one fresh native reviewer with no parent history.                                                  |
| Review this change; current session did not author it         | review-code performs direct inspection.                                                                                |
| Explicit Codex CLI review                                     | codex-review executes one fresh CLI reviewer using review-code's contract.                                             |
| Explicit ship-feature-pr                                      | Full delivery with Codex and Claude review; continue corrections according to invalidated risk.                        |
| Only request CodeRabbit on an existing PR                     | Trigger, wait, inspect, and report; no independent local reviewers or unsolicited fixes and thread mutations.          |
| Dual review a colleague's PR, then post selected feedback     | dual-review reports only; after the user selects feedback, post it as a review with GitHub attribution; no babysit-pr. |
| Babysit a colleague's PR the user has taken over              | babysit-pr operates as it does on the user's own PR.                                                                   |
| Reword the description of a colleague's PR                    | write-pr-copy with an "Edited" footer before bot-managed sections; other attribution unchanged.                        |
| Third verified correction; no user budget                     | Continue authorized stewardship while making progress.                                                                 |
| User supplied a correction limit, now exhausted               | Stop at that explicit limit and report the concrete remaining work.                                                    |
| Delegated reviewer loads review-code                          | Review directly; do not spawn another reviewer.                                                                        |
| Host defaults to full history but supports fork_turns         | Explicitly set fork_turns="none" and supply a focused brief.                                                           |
| Native host cannot isolate context                            | Fresh CLI session or parent execution.                                                                                 |
| Worker asked to launch another model without parent authority | Decline nested delegation and report the scope boundary.                                                               |

## Verification evidence

The September 12, 2026 forward-test used a fresh native evaluator with
`fork_turns="none"`, no file ownership, and no mutation or further delegation.
It inspected nine routing cases and identified two ambiguities: a new head SHA
could appear to force renewed dual review despite adequate continuation
coverage, and a CodeRabbit-only request could imply thread mutations. Both entry
points were clarified. The remaining budget, fallback, and nesting cases were
checked manually. This tests interpretation, not live end-to-end agent execution
or a mechanical host guarantee.

The October 2, 2026 forward-test of the GitHub attribution rule used the same
constraints. It covered the three colleague-PR rows plus dictated and composed
issue comments, a commit and push, and refining an agent-written description.
Every case reached the expected skill and attribution. It identified three
ambiguities: where to place a footer below another person's attribution, how to
handle a moved head or anchor before posting review feedback, and whether an
extensive reword of someone else's description is Written or Edited. The global
rule and review-code were clarified.

The installer test uses the real selection and cleanup policy with synthetic
roots and homes. It checks both worker families, directional exceptions,
disabled-link cleanup, retained Vercel guidance, and preservation of unmanaged
content. Runner tests check emitted Claude delegation denials. Neither test
invokes a live model or updates installed user configuration.
