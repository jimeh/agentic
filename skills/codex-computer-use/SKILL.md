---
name: codex-computer-use
description: >-
  Hand local computer-use verification to the Codex CLI — GUI interaction,
  simulators, app launching, screenshots, runtime inspection. Use when the
  answer has to come from a running application rather than from reading code.
---

# Codex Computer Use

Use Codex when the right next step is to observe or operate a running UI. Claude
stays responsible for planning, interpretation, validation, summarising, and
deciding next actions.

This skill is for observation and verification, not implementation or review.

## Routing Checklist

Use Codex computer use when several answers are yes:

1. Do I need to interact with a GUI?
2. Do I need observations from a running application?
3. Would screenshots improve confidence?
4. Does this require browser, simulator, device, or native app interaction?
5. Would desktop automation be more reliable than reasoning from code?
6. Am I verifying behavior rather than inferring it?

If the task is code, architecture, planning, review, or static analysis, keep it
in Claude or use a different skill.

## Workflow

1. Understand the user's goal.
2. Decide what must be observed.
3. Identify the app, browser, simulator, device, website, or local command to
   start from.
4. Define expected behavior and evidence to collect.
5. Create a temporary artifact directory for screenshots and run artifacts.
6. Run `codex-headless` with an explicit computer-use prompt.
7. Read `result.md` and inspect any screenshots or logs.
8. Validate important observations against the user's goal.
9. Summarise results and recommend next actions if needed.

## Command Shape

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-computer-use.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
```

Run Codex from the repository with enough access for local UI work:

```bash
codex-headless \
  --artifact-dir "$ARTIFACT_DIR" \
  --sandbox danger-full-access \
  -- --add-dir "$ARTIFACT_DIR" \
  < "$PROMPT"
```

Use `--sandbox workspace-write` instead when the task only needs local files and
a dev server, with no desktop, browser, simulator, or cross-app interaction.

The runner writes raw events to `events.ndjson`, concise progress to
`progress.log` and stderr, Codex diagnostics to `stderr.log`, the report to
`result.md`, and run state to `run.json`. Screenshots land beside them in the
artifact directory. UI sessions can run long; run in the background and tail
`progress.log` rather than waiting blind.

## Prompting Strategy

Keep prompts short. Describe the observation task, not the whole codebase.

Include:

- Objective
- Application, browser, simulator, device, or URL
- Starting state or launch command, if known
- Expected behavior
- Success criteria
- Evidence to collect
- Actions to avoid

Use this shape:

```text
Verify this UI behavior.

Repository: <absolute repo path>
Artifacts: <artifact directory>
Target: <app/browser/simulator/URL>
Objective: <one sentence>

Expected behavior:
- <what should happen>

Collect:
- concise observations
- screenshots for important states or failures
- reproduction steps for any unexpected behavior

Avoid:
- editing repository files
- writing outside the artifact directory except unavoidable app/browser state
- changing real account data
- closing unrelated user apps
- changing system settings unless required and explicitly allowed

Report:
- summary
- observations
- screenshots produced
- unexpected behavior
- reproduction steps
- confidence level
- suggested follow-up
```

Examples:

```text
Verify that onboarding works. Capture screenshots of each step. Report any
unexpected behavior.
```

```text
Launch the app, open Settings, enable feature X, and verify the resulting UI.
Capture screenshots if behavior differs from expectations.
```

## Safety Boundaries

- Launching apps, browsers, simulators, and local dev servers is allowed when
  needed for verification.
- Ask before acting on real accounts, sending messages, making purchases,
  deleting data, changing system settings, or closing the user's unrelated apps.
- Avoid destructive actions unless the user explicitly requested them.
- Do not ask Codex to implement code through this skill. Use implementation
  delegation separately.

## Reporting Back

Treat Codex's output as observations, not final interpretation.

Report:

- What Codex tried
- What Codex observed
- Screenshots or artifacts produced
- Unexpected behavior and reproduction steps
- Confidence level
- Recommended next step

Do not claim behavior is verified unless Codex actually observed it.

## Failure Handling

If computer use is blocked, report:

- what happened
- where execution stopped
- whether screenshots or logs were captured
- likely cause
- recommended next step

Common blockers:

- app cannot launch
- dev server is unavailable
- authentication blocks progress
- permissions are missing
- simulator/device is unavailable
- unexpected dialogs appear
- environment differs from the user's expected setup

Do not retry repeatedly without changing strategy.
