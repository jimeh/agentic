---
name: codex-implementation
description: >-
  Start, monitor, and continue a Codex implementation worker, as a T3 Code
  child task or through the Codex CLI. Use when implement-feature or the user
  selects Codex for code changes; implement-feature owns the orchestration.
---

# Codex Implementation

Load `implement-feature` first. It owns whether to delegate, the checkout, the
brief, inspection, integration, and cleanup. This skill owns starting,
monitoring, and continuing a Codex worker.

These hold whichever transport runs:

- Delegating implementation does not authorize commits on the user's branch,
  pushes, pull requests, or integration into another checkout.
- The parent owns every Git operation, and only one implementer writes to a
  checkout at a time.
- Use the `implement-feature` brief, which tells the worker to leave Git alone
  and prohibits further delegation.

## Transport

Inside T3 Code, run the implementer as a T3 child task: read and apply the
`t3-delegation` skill, using the `implementation` role. It replaces the artifact
directory, `codex-headless` commands, and session resume below. Everywhere else,
and when `t3-delegation` selects the CLI, use `codex-headless`. The session is
inside T3 Code when the host says so or offers the `t3-code` MCP server's
`delegate_task` tool, which may be listed as deferred.

A child task starts in the current thread's checkout. When `implement-feature`
isolates the work, use `isolation: "worktree"` or have the child work in a
parent-created worktree by absolute path, as `t3-delegation` describes.

## Run Codex

Write the brief to a private artifact directory and run `codex-headless` from
the checkout `implement-feature` chose, the current one or a worktree, with
`CHECKOUT_DIR` set to its absolute path:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-implementation.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"

(cd "$CHECKOUT_DIR" && codex-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --sandbox workspace-write \
  -- --add-dir "$ARTIFACT_DIR" \
  < "$PROMPT")
```

The runner always runs Codex from the current directory, so `cd` into the
checkout. Codex options such as `--add-dir` go after `--`; the runner owns the
sandbox, model, effort, session, and output flags. Use
`--sandbox danger-full-access` only when the work truly needs machine-level
access, such as simulator control, app automation, package-manager global state,
or files outside the workspace.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Codex diagnostics to `stderr.log`, the final report
to `result.md`, and run state, including the session ID, to `run.json`. For long
tasks, run in the background and tail `progress.log` for liveness; open
`events.ndjson` only to diagnose transport or model behavior. Do not kill quiet
runs; the heartbeat line confirms the process is alive.

Treat the run as failed unless the runner exited 0 and `run.json` reports
`"status": "succeeded"`; only then read `result.md` and inspect the result as
`implement-feature` describes. Exit 65 means the stream carried malformed
events, 66 means Codex produced no result, and 67 means Codex reported a failed
turn; `run.json` and `progress.log` hold the message in each case. Retry at most
once after diagnosing a transient failure.

Codex sometimes commits despite the brief. The inspection of every commit since
the starting tip covers it; never treat an empty working-tree diff as an empty
result.

## Continue

Resume the same session for a correction. Read the session ID from the previous
successful run's `run.json`, write the follow-up prompt to a fresh file, and use
a fresh artifact directory:

```bash
SESSION_ID="$(jq -er '.sessionId | select(type == "string" and length > 0)' \
  "$ARTIFACT_DIR/run.json")"
NEXT_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-implementation.XXXXXX")"
NEXT_PROMPT="$NEXT_ARTIFACT_DIR/prompt.md"

(cd "$CHECKOUT_DIR" && codex-headless \
  --artifact-dir "$NEXT_ARTIFACT_DIR" \
  --sandbox workspace-write \
  --resume "$SESSION_ID" \
  < "$NEXT_PROMPT")
```

The `jq -e` form fails instead of yielding `null` when the field is missing.
Shape the follow-up as `implement-feature` describes. Remove artifact
directories once the owning workflow has consumed them.
