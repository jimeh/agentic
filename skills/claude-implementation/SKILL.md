---
name: claude-implementation
description: >-
  Start, monitor, and continue a Claude implementation worker, as a T3 Code
  child task or through the Claude CLI. Use when implement-feature or the user
  selects Claude for code changes; implement-feature owns the orchestration.
---

# Claude Implementation

Load `implement-feature` first. It owns whether to delegate, the checkout, the
brief, inspection, integration, and cleanup. This skill owns starting,
monitoring, and continuing a Claude worker.

These hold whichever transport runs:

- Delegating implementation does not authorize commits on the user's branch,
  pushes, pull requests, or integration into another checkout.
- The parent owns every Git operation, and only one implementer writes to a
  checkout at a time.
- Use the `implement-feature` brief, which tells the worker to leave Git alone
  and prohibits further delegation.

The headless runner denies native worker tools and delegation skills, including
`implement-feature`. If the parent explicitly requires nested workers, it must
choose another supported arrangement; do not bypass the runner restrictions.

## Transport

Inside T3 Code, run the implementer as a T3 child task: read and apply the
`t3-delegation` skill, using the `implementation` role. It replaces the artifact
directory, `claude-headless` commands, and session resume below. A child task
has no runner denials, so the brief's prohibitions are the only guard.
Everywhere else, and when `t3-delegation` selects the CLI, use
`claude-headless`. The session is inside T3 Code when the host says so or offers
the `t3-code` MCP server's `delegate_task` tool, which may be listed as
deferred.

A child task starts in the current thread's checkout. When `implement-feature`
isolates the work, use `isolation: "worktree"` or have the child work in a
parent-created worktree by absolute path, as `t3-delegation` describes. For a
decision trail, create the private trail file yourself and put its path in the
prompt.

## Run Claude

Write the brief to a private artifact directory and run `claude-headless` from
the checkout `implement-feature` chose, the current one or a worktree, with
`CHECKOUT_DIR` set to its absolute path:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-implementation.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
SESSION_ID="$(uuidgen)"

(cd "$CHECKOUT_DIR" && claude-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --setting-sources user,project \
  --permission-mode auto \
  --session-id "$SESSION_ID" \
  < "$PROMPT")
```

Use `user,project` only for a trusted checkout where project guidance helps, and
`--setting-sources user` otherwise. Do not load `local` settings by default.
Never use `--safe-mode`, `--bare`, or bypass-permissions mode.

The runner defaults to Opus 5.5 at xhigh effort. Pass `--model fable` for Fable
5.1 at high effort only when the user names Fable for this task. Explicit user
model or effort instructions win. Do not force a context size.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Claude diagnostics to `stderr.log`, the final report
to `result.md`, and run state to `run.json`. For long tasks, run in the
background and tail `progress.log` for liveness.

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md` and inspect the result as
`implement-feature` describes. Exit 65 means the stream carried malformed
events, 66 means Claude produced no result, and 67 means Claude reported an
error result; `run.json` and `progress.log` hold the message in each case. Retry
at most once after diagnosing a transient failure.

Claude sometimes commits despite the brief. The inspection of every commit since
the starting tip covers it.

## Decision Trail

For long unattended work, consequential choices, or an explicit user request,
create a private trail path inside the artifact directory, pass the directory
through Claude's `--add-dir` option, and tell Claude to use the
`show-me-your-work` skill for material decisions, pivots, risks, and blockers:

```bash
TRAIL="$(mktemp "$ARTIFACT_DIR/decision-trail.tsv.XXXXXX")"
chmod 0600 "$TRAIL"

(cd "$CHECKOUT_DIR" && claude-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --setting-sources user,project \
  --permission-mode auto \
  --session-id "$SESSION_ID" \
  -- --add-dir "$ARTIFACT_DIR" \
  < "$PROMPT")
```

Put the trail path in the prompt. The runner accepts `--add-dir` only after its
own options separator, while it keeps control of model, effort, settings,
permissions, and session flags. Do not use the trail as a heartbeat, command
log, or test ledger. Audit and clean it up as `show-me-your-work` describes
before handback.

## Continue

Resume the recorded session for a correction, with a fresh artifact directory
and prompt file:

```bash
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-implementation.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

(cd "$CHECKOUT_DIR" && claude-headless \
  --artifact-dir "$NEXT_ARTIFACT_DIR" \
  --setting-sources user,project \
  --permission-mode auto \
  --resume "$SESSION_ID" \
  < "$NEXT_PROMPT")
```

The block relies on the runner's default model; add `--model` and `--effort`
only to repeat what the initial run used when it overrode that default. When a
decision trail is in use, repeat `-- --add-dir "$ARTIFACT_DIR"` so the trail
stays writable. Shape the follow-up as `implement-feature` describes.

## Lifecycle

- Let healthy runs reach terminal exit. Quiet output and low CPU are not stall
  evidence.
- Do not add a hard timeout unless the caller supplies one. Treat a 60-minute
  minimum checkpoint, preferably 90 minutes for large work, as inspection time
  rather than termination authority.
- Diagnose a terminal failure before one possible retry. Never loop blindly.
- Remove artifact directories once the owning workflow has consumed them.
