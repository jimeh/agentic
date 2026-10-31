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
decisions it relays, the merge order, and cleanup. Each worker owns its
implementation, reviews, and pull request readiness.

This skill needs T3 Code's thread tools. Outside T3 Code, say so and stop.

## Authority

- A request to orchestrate authorizes launching threads for work the user
  approved, messaging and reading them, keeping the ledger, and the cleanup
  below. Ask before launching a thread for work the user has not approved, such
  as a fix for a broken base branch.
- Merge only the pull requests the user tells you to merge: ones they name, or a
  set they name, such as the pull requests for named features, whether open or
  still to come. Record each grant in the ledger with its scope. A grant covers
  nothing outside the set it names.
- Workers never merge. Only this thread merges, one pull request at a time.
  Never bypass branch protection or a failing required check, such as with
  `gh pr merge --admin`.
- The user chooses each worker's workflow, such as `ship-feature-pr`, for named
  threads or as a standing choice in the ledger. When the ledger records none
  for the work, ask before launching. This thread never selects an explicit-only
  workflow on its own.
- Investigate and discuss here. Send implementation to a worker thread, and edit
  files here only when the user asks for it.
- Give every worker its own worktree. Never point a worker at the user's own
  checkout.

## Keep a Ledger

This thread runs for days and its context gets compacted. Keep durable state in
a ledger file outside every checkout, at
`${XDG_STATE_HOME:-$HOME/.local/state}/orchestrate-threads/<owner>-<repo>.md`.
Before the first launch, confirm that this thread can write it. A Codex thread
in `auto` mode can write only its checkout and the temporary directory; when the
ledger path is not writable, ask the user to change this thread's runtime mode
or name a writable path.

Start the ledger with a line saying that this thread runs `orchestrate-threads`
and must reload that skill after a compaction. Record:

- each active thread: its link, id, scope, workflow, pull request, state, and
  last report;
- the merge order and dependencies between pull requests;
- merge grants, each with the pull requests or set it covers;
- user decisions and preferences, each marked as standing or as applying only to
  named threads;
- the project's standing rules that every brief carries; and
- worktrees and branches waiting for cleanup.

Update it when state changes, and reread it after a compaction or whenever this
thread's own memory of the work is uncertain. Propose rules that bind every
agent in the project, not only workers, for the project's agent instructions.

A user's choice to skip a step, such as a UX review, applies to the threads they
named. Record it that way and do not carry it into later briefs.

## Launch a Worker

Launch one thread per pull request. Work that splits into several pull requests
becomes several threads: launch a dependent one after its prerequisite merges,
and run independent ones in parallel. Build a stacked series only when the user
asks for one.

Call `t3_thread_launch` with a descriptive title and a `workspaceStrategy` of
type `worktree`, with the base branch as `baseRef` and `startFromOrigin: true`.
Inherit this thread's provider, model, and modes unless the user names others,
except Fable 5.1: launch a worker on Fable only when the user names Fable for
that worker or for workers in general.

The first message is the whole brief, because the worker starts without this
thread's history. Include:

- who it works for, the project, and this thread's id as the coordinator, which
  `t3_thread_list` returns as `currentThreadId`;
- other threads running in parallel, when they may touch the same code;
- the change: the outcome, its issue, the decisions the user made, the docs and
  code to read first, and the decisions left to the worker that it must report;
- the workflow the user chose, and any step the user skipped for this thread,
  marked as a skip for this thread only;
- engine and model routing the user chose for implementation and review;
- consents the user gave that the workflow would otherwise ask for, quoted, such
  as Codex background computer use for UX reviews;
- shared resources it must not collide on, described below;
- the readiness and report-back contract below; and
- the project's standing rules from the ledger.

### Readiness and Report-Back Contract

Put this in every brief, adapted to the project. It overrides the workflow where
they differ.

- Never merge. The pull request is ready when it is out of draft, its head
  contains the current base branch, all required checks pass on that head,
  required reviews are satisfied, no valid blocking feedback is unresolved, and
  the workflow's reviews cover that head. Leave open the review threads the
  workflow leaves open, such as findings accepted as residual risk, and list
  them in the report; never resolve a thread only to reach readiness.
- When it is ready, run the workflow's hand-back checks, stop any pull request
  watch, and release the branch from the worktree with `git switch --detach`, so
  a merge can delete it. Then report to the coordinator with `t3_thread_send`,
  `mode: "auto"`: the pull request URL and head SHA, a summary, decisions made,
  review threads left open and why, known gaps, and what the user should check
  by hand. End the turn after reporting.
- To bring the head up to the base, before the first report or when the
  coordinator says the base moved, switch back to the branch if detached, rebase
  it onto the current base, and push with `git push --force-with-lease` to this
  pull request's branch. The user grants that force-push, and only to this
  branch; never force-push any other branch. A rebase without conflicts keeps
  the earlier review coverage. A rebase that resolved conflicts needs the
  follow-up review the resolution's risk calls for. Then get the checks green,
  detach, and report again.
- Send questions for the user, blockers, and failures to the coordinator the
  same way. Do not ask in the worker's own thread, where the user may not see
  the question.

## Relay and Monitor

- Message workers with `t3_thread_send` and `mode: "auto"`, which steers a
  running turn. `queue` waits until the worker's current turn ends, which can
  take hours. When a worker seems not to have received a message, check its
  queue with `t3_queue`.
- Relay a worker's question to the user with its context and your
  recommendation, and send the answer back.
- Relay each ready report to the user with the review threads left open and the
  hand checks. The hand checks block that pull request's merge until the user
  confirms them, unless the user waives them for it.
- Do not poll. Worker reports wake this thread. When the user asks for status,
  or a turn starts after a long gap, list the active threads in one call and
  read each one's latest activity with a small `limit` and `maxCharsPerItem`.
  Flag any thread that is idle without a report, waiting on an approval, or
  failed, and tell the user before nudging it.
- Read reports and recent activity, not whole transcripts. This thread's own
  context is the one that lasts.

## Merge

Merge pull requests covered by a grant one at a time, in the ledger's order.
Before each merge, verify on the current head that:

- the pull request is out of draft and its head contains the current base
  branch;
- every required check passed and every required review is satisfied on that
  head;
- the worker reported ready on that head, and the user accepted the review
  threads it left open;
- the user confirmed the hand checks, or waived them for this pull request;
- no worktree still has the branch checked out; and
- the pull request closes only the issues it should, from
  `gh pr view <number> --json closingIssuesReferences`.

After merging, tell every active worker whose pull request the merge affects
that the base moved. Never merge a head that no longer contains the base. When
the base branch fails its checks after a merge, stop merging and tell the user.
Fix it in a new thread when the fix is more than trivial and the user approves
that thread.

## Shared Resources

Workers share the user's machine. Name in each brief the resources that collide:
tests that take over the desktop's pointer and keyboard, fixed ports, shared
caches, and a single device or simulator. Serialize those across threads,
through the project's lock when it has one. Tools that run in the background
without taking the desktop can run in parallel.

## Wrap Up a Thread

When a thread's pull request has merged and its final report is in:

- settle the thread;
- remove its worktree and local branch once the worktree has no uncommitted
  changes and the branch tip equals the merged pull request's head, from
  `gh pr view <number> --json headRefOid`. A squash or rebase merge leaves the
  branch looking unmerged to Git, so compare that SHA rather than asking Git
  whether the branch merged. Keep a branch with any other commits and ask; and
- update the ledger.

When builds are large, check the disk use of the remaining worktrees and clean
the build output of idle ones with the project's clean command. Ask before
deleting anything else.
