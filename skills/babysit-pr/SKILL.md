---
name: babysit-pr
description: >-
  Steward an open GitHub pull request until its requested completion condition.
  Use when the user asks to watch, babysit, monitor, or get a PR ready; wait for
  CI or reviews; address feedback; reply to or resolve review threads; or push
  follow-up fixes. Do not merge unless explicitly asked.
---

# Babysit PR

Own the maintenance loop for an existing pull request. Invocation authorizes
relevant code fixes, proportionate validation, commits, normal pushes to the PR
branch, human-facing replies, thread resolution, and draft-to-ready transition
needed to reach the requested condition. It does not authorize force-pushing,
dismissing human reviews, merging, deploying, or releasing.

## Establish the Target

Resolve the requested PR or the PR for the current branch. Capture its URL,
base, remote head SHA, head branch, draft state, review decision, merge state,
checks, reviewers, and repository-specific requirements.

Use the existing PR, branch, and checkout as authoritative. Snapshot local
staged, unstaged, and untracked work before changing anything. Preserve
non-overlapping dirt exactly and stop when local work conflicts with the PR
branch or requested corrections.

Translate the user's request into a completion condition. When they simply ask
to get the PR ready, require the current head to have green required checks, no
valid unresolved blocking feedback, satisfied required reviews, a mergeable
branch, and non-draft state. Never infer permission to merge.

Adopt any remaining correction budget supplied by a caller workflow. Otherwise
set a context-appropriate budget, defaulting to two pushes when the user has not
requested a longer follow-through. Batch related fixes so every push represents
a deliberate candidate head.

## Build a Current Review Picture

For each candidate head, gather checks, review records and their commit ids,
general discussion, and thread-aware inline feedback. Flat comment or review
lists do not establish thread resolution. Refresh state after every wait or push
and ignore approvals or checks bound only to superseded heads.

On the initial snapshot, fetch enough history to identify every unresolved
concern, but build the active queue from current state rather than replaying all
comments. Treat resolved threads, explicitly closed concerns, and outdated
comments whose referenced code no longer applies as historical. Keep older
feedback only when it remains unresolved and still applies to the current code;
age or an older reviewed revision alone does not close it.

After the initial snapshot, fetch new comments and reviews since the last
observation together with the complete unresolved-thread set and current review
state. Use later commits, replies, rereviews, and explicit resolution signals to
reconcile relevance. Do not repeatedly process unchanged historical comments.

Include caller-supplied findings, evidence, reviewed revisions, and local
reviewer sessions even when they are not represented on GitHub. Preserve their
source and revision while reconciling them with the current PR state.

Use provider-specific skills when a selected bot has special triggering or
closure rules. In particular, use `coderabbit-review` for CodeRabbit rather than
duplicating its command and approval mechanics here.

Deduplicate feedback by underlying concern and classify it as valid, needs a
decision, already addressed, invalid, or optional. Verify claims against the
current code. Treat reviewer feedback as evidence, not authority, and explain
dismissals briefly.

## Address a Review Round

Resolve user or product decisions before editing. Batch confirmed fixes, then
use the repository's normal implementation and validation workflow. Add or
adjust tests when the concrete regression risk justifies them; otherwise record
the focused static, build, runtime, or manual evidence that closes the concern.

Use `commit` for every correction commit and push normally. Preserve earlier
test and review evidence when its revision is an ancestor and the new delta
cannot invalidate it. Choose follow-up review by affected risk:

- Inspect and verify obvious documentation, hygiene, mechanical, or test-only
  corrections directly.
- Ask the relevant reviewer to verify a localized production or subtle fix.
- Re-run all required independent perspectives only for architecture, public
  contracts, security, authentication, persistence, concurrency, lifecycle,
  supported-platform behavior, material scope expansion, or another delta that
  invalidates all prior reasoning. Use `dual-review` continuation when the
  caller requires both Codex and Claude coverage.

Count every post-invocation correction push against one shared budget, including
bot-driven corrections. Do not wait for or debug CI on a head that another known
fix will supersede.

## Reply and Resolve

Reply when it helps reviewers understand what changed or why no change is
warranted; avoid rote acknowledgements on every thread. Start every
agent-authored human-facing top-level comment, review body, inline comment, or
reply with:

```md
_Posted on behalf of jimeh by `<model-slug>` using `<harness>`._
```

Use the actual model slug and harness supplied by the current runtime. Do not
infer them from repository configuration; if either is unavailable, ask before
publishing. Attribute the model that authored the final prose, not every model
involved in the underlying work, and do not duplicate an existing notice when
editing prose. Exact bot commands and non-prose state changes such as resolving
a thread or requesting a reviewer are exempt.

Resolve a thread only after verifying its concern is fixed, invalid, or already
satisfied on the current head. Leave unresolved anything still valid or
uncertain. Never clear review state cosmetically.

## Wait and Finish

Start independent external review and CI concurrently on a settled candidate
when both are required. Use the host's wait or monitoring facility and avoid
tight polling, especially for human review. Check liveness before retrying a bot
or job, and rebuild the complete PR picture after every wake.

Route actionable CI failures and new feedback through the same bounded loop. If
the budget is exhausted, a required reviewer is unavailable, a user decision is
needed, permissions fail, or external state cannot progress, leave the PR in its
safe current state and report the blocker.

Mark a draft ready only when the requested completion condition holds on the
exact remote head. Report the final SHA, checks, review decision, unresolved
thread count, fixes and replies made, preserved local work, remaining risk, and
whether the PR is ready. Merge only when the user separately and explicitly
authorizes it.
