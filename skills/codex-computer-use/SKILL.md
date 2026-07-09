---
name: codex-computer-use
description: >-
  Ask Codex CLI / gpt-5.6-sol to perform local computer-use verification that
  needs GUI interaction, browser automation, screenshots, simulators, app
  launching, installation checks, runtime inspection, native app workflows,
  complex websites, or repeated desktop steps. Use when Claude needs
  observations from a running application, wants to verify UI behavior,
  reproduce a UI bug, collect screenshots, inspect simulator/browser/device
  state, or confirm a user flow. Do not use for writing code, architecture,
  planning, API design, code review, implementation, documentation, static
  analysis, or answers that can be produced from existing context.
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
5. Create a temporary artifact directory for screenshots and the report.
6. Run Codex with an explicit computer-use prompt.
7. Read the report and inspect any screenshots or logs.
8. Validate important observations against the user's goal.
9. Summarise results and recommend next actions if needed.

## Command Shape

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-computer-use.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
REPORT="$ARTIFACT_DIR/report.md"
```

Run Codex with enough access for local UI work:

```bash
codex exec \
  -C "$PWD" \
  --add-dir "$ARTIFACT_DIR" \
  -s danger-full-access \
  -o "$REPORT" \
  - < "$PROMPT"
```

Use `workspace-write` instead when the task only needs local files and a dev
server, with no desktop, browser, simulator, or cross-app interaction.

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
