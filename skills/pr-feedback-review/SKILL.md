---
name: pr-feedback-review
description: >-
  Analyze GitHub pull request feedback and turn it into a deduplicated action
  plan. Use when the user wants to understand what reviewers still need without
  changing code, replying, resolving threads, committing, or pushing.
---

# PR Feedback Review

Remain read-only and produce a current, evidence-backed action plan.

## Resolve and Inspect

Resolve the requested PR or the PR for the current branch. Report closed or
merged state before analyzing historical feedback.

Gather the PR metadata, commits, changed files, reviews, general discussion when
relevant, and inline review threads. Use thread-aware GitHub data whenever
resolution state matters; flat review and comment lists do not establish which
threads remain open.

Inspect the current diff and referenced code before deciding whether a concern
still applies. Consider later commits, replies, approvals, outdated context, and
explicit resolution signals. Age alone does not make feedback irrelevant.

## Reconcile Feedback

Group summary reviews, comments, and replies by underlying concern. Preserve
reviewer attribution and links while avoiding duplicate work items. Ignore empty
bot noise unless it changes review state or clarifies a concern.

Classify each concern as:

- actionable;
- needs a user or product decision;
- optional suggestion or nitpick;
- already addressed or out of scope;
- no action; or
- still inconclusive after targeted verification.

Treat reviewer claims as evidence, not authority. Attempt a focused verification
before leaving an item inconclusive. Explain briefly why excluded concerns no
longer require work.

## Present the Plan

Lead with PR state and a count by category. For each active concern, provide its
location, reviewers, concrete failure mode, why it remains in scope, and a
proposed resolution. Separate optional suggestions and previously addressed
items from blocking work, then recommend a resolution order.

Stop after the plan. Do not edit code, draft or post replies, resolve threads,
commit, push, or mutate GitHub state. Use `babysit-pr` when the user authorizes
acting on the feedback.
