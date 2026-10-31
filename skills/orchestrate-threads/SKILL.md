---
name: orchestrate-threads
description: >-
  Run a long-lived T3 Code coordinator thread for a project: plan work with the
  user, launch one top-level worker thread per pull request, relay questions and
  decisions, and sequence merges. Use only when the user asks this thread to
  orchestrate or coordinate other threads.
---

# Orchestrate Threads

The user works with this thread; the work runs in separate top-level T3 Code
threads, one per pull request. This thread owns the overview, the briefs, the
relayed decisions, the merge order, and cleanup. Each worker owns its
implementation, reviews, and pull request readiness.

This skill needs T3 Code's thread tools. Outside T3 Code, say so and stop.

## Authority

- Orchestrating authorizes launching threads for work the user approved,
  messaging and reading them, keeping the ledger, and cleanup. Ask before
  launching anything else, such as a fix for a broken base branch.
- Merge only pull requests the user told you to merge, by name or as a named
  set, such as the pull requests for named features. Record each grant and its
  scope in the ledger. Never bypass branch protection, as with `--admin`.
- Workers never merge.
- The user chooses each worker's workflow, such as `ship-feature-pr`, per thread
  or as a standing choice. When none is recorded, ask.
- Investigate and discuss here; implementation goes to workers. Every worker
  gets its own worktree, never the user's checkout.

## Keep a Ledger

This thread runs for days and gets compacted. Keep its state in
`${XDG_STATE_HOME:-$HOME/.local/state}/orchestrate-threads/<owner>-<repo>.md`,
outside every checkout. Its first line says to reload `orchestrate-threads`
after a compaction. Record the active threads with their pull requests and
state, the merge order, merge grants, user decisions marked as standing or
per-thread, standing rules for briefs, and what awaits cleanup. Reread it
whenever your memory of the work is uncertain.

A user's choice to skip a step, such as a UX review, applies only to the threads
they named.

## Launch a Worker

Launch one thread per pull request, choosing the order and what runs in
parallel; a dependent thread starts after its prerequisite merges. Stack pull
requests only when the user asks.

Call `t3_thread_launch` with a `workspaceStrategy` of type `worktree`, the base
branch as `baseRef`, and `startFromOrigin: true`. Workers inherit this thread's
provider, model, and modes unless the user names others; ask which model to use
when this thread runs on Fable 5.1. Workers need `full-access` to push, run
`gh`, and start their reviewers, so when this thread runs in another mode, ask
the user to switch it before launching.

The first message is the whole brief, since the worker has no history. Include
this thread's id as the coordinator (`currentThreadId` from `t3_thread_list`),
the change and the user's decisions about it, the workflow and any skipped
steps, the routing and quoted consents the user gave, parallel threads and
shared resources it may collide with, standing rules, and this contract:

> **Ready** means out of draft, the head contains the current base, required
> checks and reviews pass, no valid blocking feedback is unresolved, and the
> workflow's reviews cover the head. Never merge, and never resolve a review
> thread just to get there; list the ones you leave open.
>
> When ready, and again after any later change to the head, stop any pull
> request watch and report to the coordinator with `t3_thread_send` in `auto`
> mode: the URL and head SHA, a summary, decisions, open threads and why, gaps,
> and what the user should check by hand. Then end the turn.
>
> To catch up with the base, rebase onto it as the `rebase` skill describes and
> force-push with lease to this pull request's branch. The user grants that
> force-push for this branch only. A rebased head is not a continuation of the
> reviewed one: review again whatever the base's new commits or the conflict
> resolution could affect.
>
> Send questions, blockers, and failures to the coordinator the same way, not to
> your own thread.

## Relay and Monitor

- Message workers with `t3_thread_send` in `auto` mode, which steers a running
  turn; `queue` can wait hours. Check `t3_queue` when a message seems lost.
- Relay a worker's question with your recommendation, and send the answer back.
- Relay each ready report with its open threads and hand checks. The hand checks
  block that merge until the user confirms or waives them.
- Do not poll; reports wake this thread. For a status request, list the threads
  and read only each one's latest activity. Tell the user about any idle,
  blocked, or failed thread before nudging it.

## Merge

Merge granted pull requests one at a time, in the ledger's order, without
`--delete-branch`; wrap-up removes the branch. Before each merge, check the
readiness rule yourself against the current pull request, including feedback
posted since the last report. That report must be for the current head, and the
user must have confirmed its hand checks and accepted its open threads, or
confirmed them on an earlier head when nothing since could affect them. Check
that `closingIssuesReferences` lists only the right issues.

After a merge, tell the other active workers on that base that it moved. If the
base then fails its checks, stop merging and tell the user.

## Shared Resources

Name in each brief what collides across threads on the user's machine: tests
that take the desktop's pointer and keyboard, fixed ports, shared caches, and a
single device or simulator. Serialize those, through the project's lock when it
has one.

## Wrap Up a Thread

After a thread's pull request merges, settle the thread and update the ledger.
Remove its worktree and branches when the worktree is clean and its HEAD equals
the merged head from `gh pr view <number> --json headRefOid`, since Git cannot
see a squash merge. Otherwise ask. When builds are large, clean the build output
of idle worktrees with the project's clean command.
