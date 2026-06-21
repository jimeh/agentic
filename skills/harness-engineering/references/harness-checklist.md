# Harness Checklist

Use this checklist during audits, bootstraps, or broad harness changes. Mark
each item as **pass**, **gap**, or **n/a**, and include the command or file that
proves the answer. Prefer concrete evidence over inferred readiness.

## Contents

- [Project Map](#project-map)
- [Task Surface](#task-surface)
- [Formatting](#formatting)
- [Linting and Static Checks](#linting-and-static-checks)
- [Types, Schemas, and Contracts](#types-schemas-and-contracts)
- [Tests and Reproduction](#tests-and-reproduction)
- [GitHub Actions](#github-actions)
- [Dependency Intake](#dependency-intake)
- [Observability and Operations](#observability-and-operations)
- [Agent Affordances](#agent-affordances)
- [Entropy Control](#entropy-control)
- [Audit Output](#audit-output)

## Project Map

- Root `AGENTS.md` or equivalent exists and is short enough to scan.
- Root `CLAUDE.md` exists as `@AGENTS.md` when Claude Code compatibility is
  needed.
- Deeper docs are linked from the root instructions instead of duplicated.
- Non-obvious package managers, task runners, and generated files are named.
- Stable grep hints or ownership boundaries replace brittle path catalogs.

## Task Surface

- `setup` installs runtimes, dependencies, and local hooks where applicable.
- `dev` starts the app or service when the repo has a runtime surface.
- `build` creates production or distributable artifacts.
- `format` writes formatting changes.
- `format:check` checks formatting without modifying files.
- `lint` runs static checks.
- `lint:fix` exists when the ecosystem has predictable auto-fixes.
- `typecheck` or schema validation exists for typed or schema-driven projects.
- `check` is a fast confidence gate for normal handoff.
- `test` runs the default test suite or main unit-test path.
- `verify` runs broad CI-like validation.
- `doctor` checks local tools, env, services, or secrets when setup is fragile.
- `clean` removes generated or temporary local state when useful.
- Task descriptions are discoverable through the chosen task runner.

## Formatting

- Every routinely edited source format has a formatter or explicit exception.
- Formatter check mode is part of `check` or CI.
- Formatter write mode is documented and safe for agents to run.
- Generated files are either excluded or refreshed by a documented command.
- Staged-file hooks format only formats they can handle predictably.

## Linting and Static Checks

- Language linters cover the primary source languages.
- Shell scripts use `shellcheck` and, when formatting matters, `shfmt`.
- Markdown/docs use a formatter plus markdown linting when docs are active
  project inputs.
- YAML, JSON, TOML, or schema-heavy config has parser or schema validation.
- Custom project invariants live in scripts or tests with actionable messages.
- Lint checks are available locally, not only in CI.

## Types, Schemas, and Contracts

- Typed languages have typecheck commands that do not require a full build
  unless the ecosystem requires it.
- Public API, config, manifest, and generated schema files have validation.
- Behavioral contracts live in versioned docs or tests.
- Compatibility or migration rules are represented by tests or fixtures when
  they affect users.

## Tests and Reproduction

- Agents can run focused tests for common change areas without guessing.
- The default test command is documented and deterministic enough for handoff.
- Broad or slow suites are named separately from fast checks.
- Bugs can be converted into fixtures, regression tests, scripts, or browser
  flows.
- UI projects expose local dev, seed data, screenshots, or browser automation
  paths when needed.

## GitHub Actions

- Workflow syntax and expressions are checked with `actionlint`.
- Workflow security posture is checked with `zizmor`, normally in offline mode.
- Third-party actions and reusable workflows are pinned with `pinact` or an
  equivalent documented tool.
- Third-party actions use full-length SHA pins where practical.
- Workflows declare restricted `permissions:` instead of relying on defaults.
- Each CI job maps to a local command, or the docs explain why it is CI-only.

## Dependency Intake

- Lockfiles are present and treated as authoritative.
- Package installation uses frozen or locked modes where practical.
- A 3-7 day dependency cooldown is configured when the package manager supports
  it, defaulting to 7 days.
- Urgent security-update escape hatches are documented without removing the
  cooldown policy.
- Generated dependency or action metadata has a refresh/check command.

## Observability and Operations

- Local services emit logs agents can inspect.
- Startup, background jobs, queues, and workers have documented run commands.
- Performance or reliability claims have measurable commands when they matter.
- Long-running services can be started and stopped predictably.

## Agent Affordances

- Repeated multi-step workflows are documented as project-local skills or
  concise docs.
- Complex agent guidance uses progressive disclosure instead of large root
  instruction blobs.
- External or tacit knowledge needed for routine work is captured in the repo.
- Tooling choices explain what agent failure they prevent.

## Entropy Control

- Known quality gaps or tech debt have a visible tracker or cleanup doc.
- Stale docs, generated references, dead scripts, or duplicated helpers are
  detectable through checks or recurring tasks.
- Repeated review feedback is converted into a test, lint, script, or durable
  doc update.
- Cleanup changes are small enough to review and run through normal validation.

## Audit Output

Use this compact shape when reporting checklist results:

```markdown
## Harness Checklist

| Area | Status | Evidence | Gap or next check |
| --- | --- | --- | --- |
| GitHub Actions | gap | `.github/workflows/ci.yml` | Add workflow checks |

## Highest-Leverage Gaps

1. Add `actionlint`, `zizmor --offline .`, and `pinact run -check`.
2. <gap with concrete file or command>
3. <gap with concrete file or command>
```
