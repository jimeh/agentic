---
name: PR Feedback Review
description: >-
  Analyze GitHub pull request review feedback and turn it into a deduplicated,
  prioritized action plan. Use when the user asks to review PR feedback, check
  PR comments, summarize reviewer feedback, figure out what feedback is on a
  PR, determine what still needs action, dedupe repeated review comments,
  address PR feedback, plan PR fixes, or ask what still needs action on this
  PR.
---

# GitHub PR Review Action Plan

Fetch GitHub PR review feedback, decide which comments are still in scope now,
group overlapping concerns, and return a concise action plan in chat. Default to
current unresolved work, not a full replay of every historical comment.

Treat this as a planning task, not an implementation task. Enter plan mode when
the environment supports it; otherwise keep the entire interaction strictly
analysis-and-plan only. The primary deliverable is the review analysis plus a
presented plan for how to address the feedback.

## Workflow

### 1. Resolve the PR

- If the user provides a PR number, URL, or branch, use that target.
- Otherwise, inspect the current branch's PR with:
  `gh pr view --json number,title,url,reviewDecision,state,headRefName,baseRefName,updatedAt`
- If no PR can be resolved, stop and ask for a PR number or URL.
- If the PR is `CLOSED` or `MERGED`, note that state and confirm the user wants
  to continue before analyzing historical feedback.

### 2. Verify access and gather review data

Run these commands in parallel when possible:

- `gh auth status`
- `gh repo view --json nameWithOwner -q .nameWithOwner`
- `gh pr view <target> --json number,title,url,author,reviewDecision,state,headRefName,baseRefName,updatedAt,files,commits`
- `gh api repos/<owner>/<repo>/pulls/<number>/reviews --paginate`
- `gh api repos/<owner>/<repo>/pulls/<number>/comments --paginate`

Use the PR metadata to understand commit timing and changed files. Use the
reviews endpoint for summary reviews and the comments endpoint for inline review
comments.

Only fetch general PR issue-thread comments with:

- `gh api repos/<owner>/<repo>/issues/<number>/comments --paginate`

Do that only when the user asks for a full PR discussion review, or when the
review data clearly points to unresolved discussion happening in the general PR
thread.

### 3. Normalize the working set

Convert reviews and inline comments into one working set with, at minimum:

- comment kind: `review-summary` or `inline-comment`
- author
- created time
- raw body text
- state or review status when available
- file path and line numbers when available
- review id and comment id
- `in_reply_to_id` when available
- `html_url` for traceability
- thread or reply grouping information
- any explicit resolution or dismissal signal

Drop empty bodies and obvious bot noise unless they materially confirm,
withdraw, or clarify a concern.

Discard bodiless review records unless the state itself matters for context,
such as dismissed reviews or an approval following prior requested changes.

### 4. Decide current scope before grouping

Prefer comments that are still actionable now.

If the user explicitly asks for a full review, include all comments and mark
addressed items as historical rather than excluding them.

Include by default:

- newer comments since the last substantial author update
- unresolved comments or threads
- older comments that still appear unaddressed
- older comments repeated later by the same or another reviewer
- summary reviews that introduce a distinct unresolved concern

Exclude or downgrade by default:

- praise-only comments
- comments explicitly saying no change is needed
- comments superseded by newer comments on the same concern
- comments tied to code or diff context that has changed materially since the
  comment was left
- comments clearly addressed by later commits, later reviewer approval, or a
  later follow-up confirming resolution

Infer whether a comment is already addressed by combining several signals. Use
concrete checks such as:

- `git log --format='%H %aI' --after=<earliest_comment_date>`
- commit timing relative to the comment
- whether later commits touched the relevant file or area after the comment was
  posted
- `git log --format='%H %aI' --after=<comment_date> -- <path>` for path-specific
  follow-up changes
- whether a newer comment or review supersedes the older one
- whether a later reviewer message confirms the issue is resolved
- whether the concern still matches the current diff context

Do not use age alone as the deciding factor. Old comments can stay in scope if
they still appear unresolved.

When the status is ambiguous, mark the concern for verification instead of
dropping it silently.

Do not silently skip likely addressed items. Keep a brief `Previously Addressed`
or `Resolved / Out of Scope` section with the reason they were excluded from
active work.

### 5. Group and dedupe by underlying concern

Group by root issue, not by raw comment count.

- Merge repeated comments about the same bug, risk, naming issue, test gap, or
  design concern.
- Merge summary-review feedback and inline comments when they point to the same
  underlying problem.
- Keep genuinely separate issues separate even if they are in the same file or
  thread.
- Preserve all relevant reviewer names and links even when one comment becomes
  the representative example.

For each group, collect all supporting comments instead of repeating the same
plan multiple times.

### 6. Verify ambiguous concerns

Before final categorization, actively verify any concern that is still unclear.

Use the cheapest targeted checks that can resolve the ambiguity, for example:

- inspect the current file and surrounding code at the referenced location
- inspect the current PR diff for the affected file or hunk
- compare comment timing against later commits
- inspect later review comments or review summaries for confirmation,
  supersession, or resolution
- inspect whether follow-up commits actually changed the area the comment was
  about

Do not leave a concern as `needs-verification` until you have attempted a
reasonable verification pass.

After verification:

- reclassify as `actionable` if the issue still appears unresolved
- reclassify as `resolved/out-of-scope` if the concern is clearly no longer
  relevant
- reclassify as `no-action` if verification shows the reviewer concern was
  already addressed or does not require a change
- keep `needs-verification` only if the available evidence is still genuinely
  inconclusive

### 7. Categorize each concern

Classify each grouped concern as one of:

- `actionable` — clear change needed
- `needs-decision` — valid concern, but resolution requires a product or design
  choice
- `suggestion/nitpick` — optional improvement, non-blocking preference, or
  explicitly minor feedback
- `needs-verification` — verification was attempted, but the available evidence
  is still inconclusive
- `no-action` — positive feedback, clarification, or explicit confirmation that
  nothing should change
- `duplicate` — fully covered by another grouped concern
- `resolved/out-of-scope` — previously relevant, but no longer needs work now

### 8. Present as a Plan

Present the result as a plan. Do not transition from analysis into
implementation. Present the plan for user approval before making any changes.
Stop after presenting the plan and wait for approval before any code changes,
reply drafting, or other implementation work.

Return a concise, deterministic response using this structure:

```md
## PR Feedback Summary: <PR title> (#<number>)

Review decision: <reviewDecision>
PR state: <state>
Scope mode: <current unresolved work | full review>

### Actionable Items

#### 1. <Short description>
- **Category**: actionable / needs-decision
- **Raised by**: @reviewer1, @reviewer2
- **Location**: `path/to/file.ts:42-58` or `general`
- **Why still in scope**: <why it remains active now>
- **Comment summary**: <brief concern summary>
- **Proposed resolution**: <concrete approach>
- **Links**: <html_url references>

### Suggestions / Nitpicks

#### 1. <Short description>
- **Raised by**: @reviewer
- **Location**: `path/to/file.ts:10` or `general`
- **Comment summary**: <brief summary>
- **Suggested handling**: <adopt, defer, or skip with reason>
- **Links**: <html_url references>

### Needs Verification

Only include items that remained inconclusive after targeted verification.

### No-Action / Positive Notes

- Brief acknowledgments of praise, clarifications, or confirmations that no
  change is needed.

### Previously Addressed / Resolved Out of Scope

- Brief items excluded from active work, with the reason they were treated as
  already handled or no longer relevant.

### Recommended Resolution Order

1. Highest-impact blocking concerns
2. Remaining requested changes and open decisions
3. Optional suggestions worth adopting
```

Also include a short count summary at the end:

- total feedback items considered
- counts for actionable, needs-decision, suggestion/nitpick, no-action,
  resolved/out-of-scope, and still-inconclusive items

Do not make code changes, draft replies, or post comments until the user
approves the plan.

## Edge Cases

- **No PR found**: ask the user for a PR number or URL
- **No feedback at all**: report that the PR has no review feedback and stop
- **All feedback is positive or no-action**: report that no changes are needed
  and list the notable positive items briefly
- **All feedback appears addressed**: report that no active work remains and
  list the resolved items briefly
- **Very large PRs**: use `--paginate`; summarize concerns instead of dumping
  every comment verbatim
- **Dismissed reviews**: keep them for context, but do not let them drive active
  work unless a distinct concern remains unresolved
- **Reply-only threads**: reconstruct thread context before deciding category

## Guidelines

- Favor the current review state over historical completeness.
- Be explicit about what was excluded and why when the distinction matters.
- Cite file paths and lines when available.
- Acknowledge praise or "this is fine" comments briefly, then move on.
- Prefer resolving ambiguity through targeted inspection over surfacing a large
  `needs-verification` bucket.
- Preserve reviewer attribution and traceability accurately.
- Keep optional suggestions separate from blocking or clearly requested work.
- Make the plan presentation explicit: the user should be able to review the
  proposed work and approve it before any implementation begins.
- If the user specifically asks for only the latest review round, narrow scope
  further to the newest unresolved feedback and say so.
- Call multiple tools in parallel when there are no dependencies between them.
- Never modify code, create commits, or push changes — this skill is read-only.
