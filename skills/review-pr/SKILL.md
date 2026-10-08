---
name: review-pr
description: >-
  Review another author's pull request and recommend a merge verdict. Use when
  asked to review, dual-review, or re-review a PR the active GitHub CLI account
  did not author or take over. Posting and approval need an explicit grant.
---

# Pull Request Review

Review a pull request on the user's behalf when someone else authored it. The
result that matters is a merge verdict the user can act on. Every comment costs
the author a round trip, so raise what changes the merge decision and keep the
rest brief.

`review-code` owns the brief, inspection, finding acceptance, currentness, and
posting mechanics. `dual-review` owns the two reviewer channels and their
reconciliation. This skill owns authorship routing, finding classes, the
verdict, follow-up scope, and what may be posted without asking. A delegated
reviewer does not apply this skill; it reviews directly under `review-code`.

## Confirm Authorship

Resolve the pull request from the number, URL, or the requested branch. Compare
its `author.login` with the active GitHub CLI account on the pull request's host
(`gh api user --jq .login`).

- A different author, including a bot, means this skill applies.
- The same author, or a pull request the user says they have taken over, means
  the user's own pull request. Use `review-code`, plus `dual-review` only when
  requested. No verdict applies and the grants below do not. Post only through
  the `review-code` posting rules; a request to post findings selects every
  reported finding. Approve a taken-over pull request only on a separate
  instruction given after the user has seen the findings.
- A branch without a pull request is not a pull request review. Use
  `review-code`.
- When either lookup fails or the host is unauthenticated, ask the user before
  reviewing.

Apply this skill only when the user asks for the review. A review that
`babysit-pr` or `ship-feature-pr` runs follows that workflow instead.

When the pull request contains commits from the active account, say so in the
report. A branch rule requiring approval of the most recent push may discount
the user's approval. Those commits may also mean the user has taken it over.
Unless the user has said whether they have, ask before reviewing when the
request carries a grant; otherwise review and ask in the report.

## Run the Review

Use `dual-review` for every round, including follow-ups, unless the user asks
for a single reviewer. Switch the checkout to the pull request branch when the
user asks and the working tree is clean; stop and ask when it is not. Without
that request, follow the `review-code` checkout rule.

Add to the `review-code` brief:

- the pull request description, linked issues, stated scope, and non-goals;
- the author's replies and decisions on earlier review threads;
- operational facts or conventions the user supplied, such as a deployment
  procedure; and
- the finding class and origin definitions below, copied into the brief, with an
  instruction that every reviewer finding states both. Reviewers cannot be
  assumed to load this skill.

Do not wait for CI, other GitHub reviewers, or bots. Keeping CI green is the
author's responsibility. Report check state as observed and never gate the
verdict or an approval on it, including under a grant to approve if everything
is fine.

## Classify Findings

Give every accepted finding one class:

- **Blocking:** a confirmed defect with a realistic trigger and material impact
  that the pull request either introduces or leaves unfixed within its own
  stated goal. Material impact includes incorrect results, financial errors,
  data loss, security exposure, and outages, even when the trigger needs an
  uncommon but supported input or configuration. A defect whose impact is
  limited and recoverable, such as a misleading message or a manual retry, is
  optional.
- **Question:** a concern that depends on facts you cannot inspect, such as a
  deployment procedure, team convention, or intended behavior. Ask rather than
  assert severity.
- **Follow-up:** a real issue outside this pull request's scope, including a
  pre-existing defect it touches or exposes. Recommend separate work. It does
  not block, but the author must not be able to miss it.
- **Optional:** a concrete improvement worth its cost that the author may
  decline. An optional note never justifies withholding approval; if it seems
  to, check it against the blocking definition.

Drop stylistic and speculative suggestions, and hypothetical-future ones that
depend on code, inputs, or configuration that do not exist and that nothing in
the repository suggests are coming. Raise a missing regression test as optional
unless the pull request's stated goal depends on it.

Record each finding's origin: introduced by this pull request, an incomplete
part of what it set out to do, or pre-existing. A pre-existing issue is a
follow-up unless the pull request claims to fix it. It stays a separate
follow-up even when it shares a root cause with a finding the pull request
introduced.

## Decide the Verdict

- **Approve:** no blocking findings and no open questions that could reveal one.
  Optional and follow-up items may accompany an approval.
- **Request changes:** at least one blocking finding. This takes precedence over
  open questions, which accompany it.
- **Undecided:** no blocking findings, but a question that could reveal one.
  Name the question and who can answer it.

## Run Follow-Up Rounds

When the author has pushed changes or replied:

- Read the author's replies first. Treat a reasoned decline of an optional or
  follow-up item as settled. Re-raise a declined blocking finding only with
  evidence the reasoning does not address.
- Scope the round as `review-code` scopes follow-up rounds: whether each earlier
  finding is fixed, defects introduced by the new commits, and any new changes
  beyond those fixes. Do not raise new optional items in code already reviewed
  and unchanged, even when a reviewer reports them; omit them from the report,
  including from dismissals. Treat a newly found blocking defect in unchanged
  code like any blocking finding, and say an earlier round missed it. Treat a
  new follow-up found there like any other follow-up. Post a new question found
  there under a grant only when it could reveal a blocking defect; report the
  rest to the user only.
- Give both reviewers the earlier findings with their status and the author's
  replies. Verifying earlier conclusions is the purpose of the round, so this is
  the verification request `dual-review` allows seeding for. Prefer
  `dual-review` continuation and start fresh reviewers only when it does not
  qualify.
- Report a status table of earlier findings before any new ones. When the user's
  earlier review requested changes, say it stays in effect until an approval or
  dismissal replaces it.

## Report

Lead with the verdict and a one-line reason. Then list blocking findings,
questions, follow-ups, and optional notes, each with its origin, file and line,
and fix direction. Add the `review-code` report items: target, currentness, and
the validation verdict. Include check state as observed.

End with the next action and the decision it needs from the user, such as "Ready
to approve with two optional notes. Approve?" When a grant covers the outcome,
report what was posted instead.

## Post Only What the User Granted

Without a grant, report only. Never post, approve, or request changes on
inference. These grants replace the `review-code` default event; never fall back
to a `COMMENT` review because a grant is unclear.

A grant comes from the user's current request and covers only the round that
request starts. It never carries into later rounds; each follow-up request needs
its own grant. A request to post after a report grants posting for that report.
Each grant covers only the cells in its row, and a request that names specific
events covers only those. A request that matches no row and selects no findings
stays report-only:

| User grant                     | Approve verdict    | Request changes verdict | Undecided verdict |
| ------------------------------ | ------------------ | ----------------------- | ----------------- |
| "Approve if everything's fine" | Submit an approval | Report only             | Report only       |
| "Post whatever the outcome"    | Submit an approval | Submit request changes  | Submit a comment  |
| "Post findings, don't approve" | See below          | Submit request changes  | Submit a comment  |

Only a request that tells you to approve, conditionally or outright, or to post
whatever the outcome or verdict, grants an approval. Asking whether to approve,
or saying not to, grants none. Optional, follow-up, and question items that
could not reveal a blocking defect do not prevent that approval. Any other
request to post or submit findings or the review, such as "submit your review on
my behalf", is the "Post findings, don't approve" grant. Under it, an approve
verdict with optional, follow-up, or question items posts them as a comment
review; without them it posts nothing. Either way, report that the pull request
is ready to approve.

A grant posts every accepted finding this round may post, in the layout below.
When the user selects findings instead, post only those. Selecting a blocking
finding grants request changes unless the user names another event; any other
selection posts a comment.

A request for a pending or draft review creates the review with its comments and
never submits it, whatever the verdict. When the grant is still ambiguous for
the actual outcome, report and ask.

Post through the `review-code` posting rules, including the head refresh and the
GitHub attribution style. If the head moved from the pinned head, do not post,
even for a selection; report the movement and wait. This replaces the
`review-code` recheck.

Lay out a posted review as follows. Each inline comment names its file and line
and its class in the text, so it reads on its own; an optional note says the
author may decline it.

- The review body states the outcome in a sentence and lists findings that
  cannot anchor inline. A comment review for an approve verdict says there are
  no blocking findings; it never reads as an approval. In a follow-up round, the
  body also says which earlier findings are resolved. Under a selection, in any
  round, the body describes only what is posted instead of the outcome and never
  states a verdict the user held back.
- Blocking findings and questions go inline where the diff allows.
- Follow-ups go in a visible body section that recommends tracking each one
  separately from this pull request.
- Optional notes go in a collapsed `<details>` section of the body. Post a
  selected optional note inline where it anchors.

Resolve review threads only when the user asks.
