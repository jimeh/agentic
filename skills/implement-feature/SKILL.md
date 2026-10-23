---
name: implement-feature
description: >-
  Run the implementation phase of a non-trivial change: implement directly or
  delegate, choose the checkout, brief and inspect a worker, integrate, and
  clean up. Use to implement a settled plan or feature, when a workflow or
  worker skill hands over implementation, or when the user routes hands-on work
  to an engine for the session. Small fixes need no skill.
---

# Implement Feature

Own the implementation of a change: who writes the code, in which checkout, and
how every resulting path is accounted for before delivery. The worker skills,
`codex-implementation` and `claude-implementation`, own only how a worker is
started, monitored, and continued.

## Authority

- Implementation authority covers editing files within the requested scope.
  Committing on the user's branch needs commit authority. Pushing, opening a
  pull request, or integrating into another checkout or the main branch needs
  the user's say-so or an owning workflow that grants it.
- One writer per checkout. While a worker runs, the orchestrator may read files
  and diffs, but must not edit files, change Git state, or run commands that may
  mutate the checkout. If another writer appears, pause and account for the
  resulting state before continuing.
- The orchestrator owns every Git operation. Workers leave Git alone.
- Preserve unrelated local work exactly. Do not stash, discard, normalize, or
  absorb it.
- If you were started as a delegated implementer, implement directly in the
  checkout your brief names. The rest of this skill does not apply to you.

## Start From a Settled Task

Start from a contract the user supplied or approved, a `plan-feature` contract,
or a task whose scope, success, and verification are already clear. Otherwise
use `plan-feature` first. Split work that holds more than one deliverable before
delegating any of it.

## Implement Directly or Delegate

Implement directly by default. Delegate when:

- the user asks for a worker or names an engine;
- a session routing preference is active, as described below;
- an owning workflow requires a separate implementer; or
- authorized parallel work needs more than one implementer.

When these conflict, the user's instruction for the task wins, then the owning
workflow, then the session routing preference, then this default.

When delegating, keep these with the orchestrator: design, API, UX, and naming
decisions; destructive or irreversible operations; pushes and other external
mutations; work that needs the orchestrator's own session tools, such as MCP
servers, authenticated browser sessions, or secrets; GUI and runtime
observation, which belongs to `ux-review` or `codex-computer-use`; and final
judgment. If writing the brief forces a decision, that decision is design work:
settle it first.

Prefer a native subagent of the current engine, started without parent history
(`fork_turns="none"` where supported). Use the matching worker skill for the
other engine, or when native tools cannot provide the isolation or continuation
the task needs. Set the model and effort explicitly: `multi-agent-execution`
routing in a Claude host, and the configured model and effort that
`t3-delegation` describes in a Codex host. A worker skill applies its own
transport's routing.

### Session routing preference

When the user routes hands-on work to an engine for the rest of the session,
such as "use Codex for implementation from now on", honor it for later hands-on
work until they end it, including small fixes, tests, and bulk reading. Use the
matching worker skill: `codex-implementation` or `claude-implementation` for
code changes, `codex-analysis` or `claude-analysis` for read-only work, and
`codex-review` or `claude-review` for review. "Do this one yourself" overrides
it for one task. The list of work kept with the orchestrator still applies.

## Choose the Checkout

By default, one implementer works in the current checkout with exclusive
mutation ownership. An owning workflow's topology choice wins over this default.
A clean checkout dedicated to the thread, such as a T3 Code worktree, already
counts as isolated.

Use a separate worktree and branch for each implementer when:

- more than one implementer runs at the same time;
- another actor must mutate the checkout while the implementer runs;
- unrelated local changes overlap the scope, or the scope, local changes, or
  broad tooling such as formatters and code generators make it unsafe to
  attribute changes; or
- resets, perturbations, generated-output cleanup, watchers, or services are
  unsafe while implementation runs.

Run destructive validation in a disposable worktree created from a captured
revision after the implementer hands back; never copy or perturb a moving
uncommitted implementation. Worktrees do not isolate processes, ports, caches,
or external state; provision those separately.

Before starting, record the starting baseline: the branch,
`START_TIP="$(git rev-parse HEAD)"`, and, when unrelated changes stay in the
checkout, the content-hash snapshot that `t3-delegation` describes. `git status`
alone misses a commit and a second edit to an already modified file.

To isolate, create the worktree from the starting tip and prepare it with the
project's setup before a worker uses it:

```bash
TASK_SLUG="<short-task-slug>"
WORKTREE_PARENT="$(mktemp -d "${TMPDIR:-/tmp}/impl-worktree.XXXXXX")"
WORKTREE_DIR="$WORKTREE_PARENT/worktree"
BRANCH="impl/$TASK_SLUG"
git worktree add -b "$BRANCH" "$WORKTREE_DIR" "$START_TIP"
```

When the task depends on uncommitted input, use the current checkout or move
only explicitly scoped input into the worktree. Never copy unrelated changes.

## Brief the Implementer

A fresh worker starts with no context. Give it this shape:

```text
Implement this scoped change. The parent settled the contract; do not plan,
delegate, or switch checkouts.

Repository: <absolute checkout path>
Objective: <one sentence>
Contract: <the settled contract, or the path to its file>

Constraints:
- <task constraints and non-goals>
- Preserve unrelated changes. Leave Git alone: do not commit, push, open a
  pull request, deploy, or edit global configuration.
- Do not invoke delegation skills or launch native or CLI model workers.
- Stop and report if architecture, API, product, UX, or destructive decisions
  are required.
- You run unattended; the parent cannot answer questions mid-task. Complete
  every step the objective covers, stopping early only for the conditions
  above.

Files to inspect first:
- <paths if known>

Success criteria:
- <observable behavior>

Verification:
- <focused command or evidence>

Report:
- summary and files changed
- material decisions and assumptions
- verification run and result
- limitations or blockers
```

For a user-facing change, the verification includes checking the change in the
running app at the sizes and themes the contract names. For a web UI change,
include the guideline rules the contract settled, with the markup and CSS rules
from the same fetch. Let the worker read the repository; do not paste diffs or
project instructions.

## Inspect the Result

After the worker's transport reports success:

- Inspect the status, the working-tree diff, and `git diff "$START_TIP" HEAD`. A
  worker may commit despite the brief, and a review of the working tree alone
  then passes vacuously.
- Account for every changed and untracked path against the starting baseline.
  Resolve uncertain ownership before staging, deleting, or ignoring anything.
- Judge the complete result as you would a contributor's pull request. Verify
  consequential claims, and run only missing or invalidated focused checks.
- The implementer owns focused tests while building; the orchestrator decides
  whether the evidence is sufficient. Use `review-code` when a review is
  requested or required. Delegation alone does not add a reviewer, and a fresh
  same-engine reviewer is not cross-engine review.

## Correct

Send settled corrections back to the same worker when practical. A resumed
session gets only what is wrong, the revision boundary, and the proof expected.
A T3 Code child task cannot be resumed, so its follow-up carries the full brief,
as `t3-delegation` describes. A shared-checkout implementer continues from the
current head. If the scope grows, stop and split it. If repeated attempts make
no progress, reassess the approach or take the work back, and honor any budget
the user set.

## Integrate and Clean Up

Shared-checkout work is already in place. Commit it only with commit authority,
scoped to the feature's paths, through `commit`.

For an isolated result, read
[the integration reference](references/integration.md) before moving it,
cleaning up, or starting a later round. It covers capture, squash integration,
separate clones, capture without commit authority, realignment, and cleanup
commands. These rules hold regardless:

- Capture the worker's complete result on its own throwaway branch before moving
  it. `git merge --squash` sees only commits, so uncommitted worker output would
  vanish. A commit on a branch this workflow created is capture, not delivery.
- Never move, reset, or remove another implementer's active branch or checkout.
- Reset a worktree to the destination only after the previous round is
  integrated, meaning committed on the destination. A staged squash is not
  integrated.
- Keep a branch that backs an open pull request.

Remove worktrees, branches, and artifacts this workflow created once the result
is delivered or abandoned.

## Report

Report what changed, the files changed, the verification run and what it proves,
deviations from the contract with their reasons, and what remains.
