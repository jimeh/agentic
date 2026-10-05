---
name: t3-delegation
description: >-
  Run a delegated worker as a T3 Code child task instead of a headless CLI. Use
  inside T3 Code once a worker skill or workflow has selected a separate worker;
  does not decide whether to delegate.
---

# T3 Delegation

T3 Code can run a worker on any enabled provider as a child task of the current
thread. Inside T3 Code, that replaces the `codex-headless` and `claude-headless`
transports. The calling skill still owns whether to delegate, the brief, the
prompt contract, verification, and the report. This skill owns how the worker is
started, awaited, and continued.

## Select the transport

The session runs inside T3 Code when the host says so or exposes the `t3-code`
MCP server's `delegate_task` tool. Tool names may carry an MCP prefix and may be
deferred, so load them before deciding they are absent.

Read `orchestrator_capabilities` once per workflow; the catalog is large. Use a
child task when the target provider reports `canRunChildTask`, and also
`canRunCrossProviderChildTask` when it is not the current provider.

Use the calling skill's headless CLI transport instead when:

- the session is not inside T3 Code;
- the provider cannot run child tasks; or
- the user explicitly asks for the CLI.

A same-provider worker may still use the host's native subagent tool when the
calling skill prefers one and that tool supports the selected model.

## Start the worker

Call `delegate_task` with:

- `target.providerInstanceId` and `target.model` from the catalog;
- `target.options` setting the effort explicitly, using the option ids in that
  model's catalog entry, because they differ by provider;
- `role` matching the work: `review`, `research`, `implementation`, or `test`;
- a distinct `clientRequestId`, reused only to retry the same round; and
- `task` holding the complete prompt.

Route models as the CLI transports do. T3's own default effort can be lower, so
never leave the effort unset.

- Claude: Opus 5.5 at high effort. Use Fable 5.1 at high effort only when the
  user names Fable for this work.
- Codex: the `model` and `model_reasoning_effort` in the user's Codex
  configuration (`${CODEX_HOME:-$HOME/.codex}/config.toml`), which is what
  `codex-headless` runs with. Use high effort when the configuration sets none.

Explicit user model or effort instructions win.

The child starts from the task prompt and the project's instructions, without
parent history. Write the calling skill's prompt contract into `task` in full,
even though the child can usually load installed skills by name.

Nothing mechanically stops a child from delegating further: it has its own
subagent and T3 tools, and the `claude-headless` denials do not apply. Include
the calling skill's prohibition on nested delegation in every prompt.

## Access and workspace

A child task starts in the current thread's checkout, on the same branch, and
`delegate_task` cannot bind it elsewhere. It keeps the parent's file access: no
mode gives a read-only sandbox.

Set `interactionMode` to `default` for every worker. An omitted value inherits
the parent's mode, and plan mode adds no sandbox.

- Read-only work, such as review and analysis: state the read-only boundary in
  the prompt. Snapshot `git status` before starting and confirm the checkout is
  unchanged afterwards.
- Implementation in the thread's checkout: record the starting tip and status
  first, run one implementer there at a time, and give it exclusive mutation
  ownership of the checkout until it finishes.
- Implementation in a separate worktree, when the calling skill requires
  isolation or several implementers run concurrently: create each worktree
  yourself under the temporary directory, as the calling skill's commands do,
  and put its absolute path in the prompt. The child starts in the thread's
  checkout, so tell it to work only in that worktree and to touch no other
  checkout. Snapshot the thread's checkout first and confirm it is unchanged
  afterwards. T3 still shows the child against the thread's checkout, so judge
  the result from the worktree itself.

`t3_thread_launch` can bind a thread to a worktree, but it starts a separate
top-level thread. Use it only when the user asks for one.

Leave `runtimeMode` inherited, or lower it when the task needs less access. A
lowered mode can confine the child to the thread's checkout and the temporary
directory, which is why a separate worktree belongs there. Never raise the mode
above the parent's. Do not select `approval-required` to restrain a worker: the
child then waits on approvals that only the user can grant in the T3 UI, and the
parent cannot answer them. If the parent itself runs in that mode, tell the user
that the child will need their approvals.

## Await the result

Use `mode: "async"` for anything longer than a quick lookup. T3 wakes this
thread when the child finishes, so continue other work or end the turn instead
of polling. Start concurrent workers, such as both dual-review channels, in the
same step. Use `mode: "wait"` only when this turn needs the result before it can
continue. `timeoutMs` is the parent's wait budget: `waitTimedOut` neither
cancels nor fails the child, so keep the `taskId` and read `task_status` later.

The calling skill's lifecycle rules still apply. A quiet child is normal.
`task_status` reports liveness, and the activity view of `t3_thread_read` on
`childThreadId` shows whether the child is working or waiting on an approval.
Use `task_cancel` only for user cancellation, an explicit deadline, or concrete
evidence of a failure or wedge.

Accept a result only when the task reports `status: "completed"`. Its `summary`
is the worker's final message, or the provider error on failure. There is no
artifact directory, `run.json`, or `result.md`, and nothing to clean up. Where
the calling skill hands a session handle to its caller, hand over the `taskId`.

## Continue a worker

A child task cannot be resumed. For a follow-up round, start a new task whose
prompt carries the original brief, the earlier findings or report, the responses
to them, unresolved objections, and the prior and new revision boundaries. Track
each round by its own `taskId`, and do not message `childThreadId` to continue
the work. Where the calling skill says to resume the same session, this
brief-carrying task is the T3 equivalent.

## Failure handling

If `delegate_task` cannot start the worker or the provider errors, diagnose from
the `summary` and the child thread before retrying, and retry at most once for a
transient failure. Fall back to the calling skill's CLI transport when the child
task route stays unavailable and the CLI is installed.

Report which transport ran, with the provider, model, and effort.
