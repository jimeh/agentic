---
name: review-pr
description: >-
  Review another author's pull request and recommend a merge verdict. Use when
  asked to review, dual-review, or re-review a PR the active GitHub CLI account
  did not author. Posting and approval need an explicit grant.
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
- The same author means the user's own pull request. Use `review-code`, plus
  `dual-review` only when requested. GitHub does not let authors approve their
  own pull requests, so no verdict or approval applies.
- A branch without a pull request is not a pull request review. Use
  `review-code`.
- When either lookup fails or the host is unauthenticated, ask the user before
  reviewing.

When the pull request contains commits from the active account, say so in the
report. A branch rule requiring approval of the most recent push may discount
the user's approval.

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

Do not wait for CI, other reviewers, or bots. Keeping CI green is the author's
responsibility. Report check state as observed and never gate the verdict or an
approval on it, including under a grant to approve if everything is fine.

## Classify Findings

Give every accepted finding one class:

- **Blocking:** a confirmed defect with a realistic trigger and material impact
  that the pull request either introduces or leaves unfixed within its own
  stated goal. When the trigger needs an uncommon but already supported input or
  configuration, the defect blocks only if it can cause data loss, a security
  exposure, or an outage; otherwise it is optional.
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
- **Undecided:** no blocking findings, but a question whose answer decides
  whether something blocks. Name the question and who can answer it.

## Run Follow-Up Rounds

When the author has pushed changes or replied:

- Read the author's replies first. Treat a reasoned decline of an optional or
  follow-up item as settled. Re-raise a declined blocking finding only with
  evidence the reasoning does not address.
- Scope the round to whether each earlier finding is fixed, defects introduced
  by the new commits, and any new changes beyond those fixes. Do not raise new
  optional items in code already reviewed and unchanged, even when a reviewer
  reports them. Report a newly found blocking defect in unchanged code, and say
  an earlier round missed it.
- Give both reviewers the earlier findings with their status and the author's
  replies. Verifying earlier conclusions is the purpose of the round, so this is
  the verification request `dual-review` allows seeding for. Prefer
  `dual-review` continuation and start fresh reviewers only when it does not
  qualify.
- Report a status table of earlier findings before any new ones.

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
its own grant. Outcomes a grant does not name stay report-only:

| User grant                     | Approve verdict    | Request changes verdict | Undecided verdict |
| ------------------------------ | ------------------ | ----------------------- | ----------------- |
| "Approve if everything's fine" | Submit an approval | Report only             | Report only       |
| "Post whatever the outcome"    | Submit an approval | Submit request changes  | Submit a comment  |
| "Post findings, don't approve" | See below          | Submit request changes  | Submit a comment  |

A request to post or submit findings or the review that does not mention
approval, such as "submit your review on my behalf", is the "Post findings,
don't approve" grant. Under it, an approve verdict with optional or follow-up
notes posts them as a comment review; without notes it posts nothing. Either
way, report that the pull request is ready to approve.

A request for a pending or draft review creates the review with its comments and
never submits it, whatever the verdict. When the grant is still ambiguous for
the actual outcome, report and ask.

Post through the `review-code` posting rules, including the head refresh and the
GitHub attribution style. If the head moved from the pinned head, do not post on
a grant; report the movement and wait.

Lay out a posted review as follows:

- The review body states the outcome in a sentence and lists findings that
  cannot anchor inline. A comment review for an approve verdict says there are
  no blocking findings; it never reads as an approval.
- Blocking findings and questions go inline where the diff allows. Each comment
  names its file and line in the text so it reads on its own.
- Follow-ups go in a visible body section that recommends tracking each one
  separately from this pull request.
- Optional notes go in a collapsed `<details>` section of the body. Post an
  optional note inline only when the user selected it.

Resolve review threads only when the user asks.
