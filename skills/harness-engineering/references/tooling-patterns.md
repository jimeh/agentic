# Tooling Patterns

Use this when a project needs faster agent feedback, clearer task entry points,
or supply-chain hardening.

## Contents

- [Standard Task Surface](#standard-task-surface)
- [Validation Tiers](#validation-tiers)
- [Local Hooks](#local-hooks)
- [CI and Workflow Hardening](#ci-and-workflow-hardening)
- [Tool Surface Hygiene](#tool-surface-hygiene)
- [Dependency Intake](#dependency-intake)
- [Optional GitNexus](#optional-gitnexus)

## Standard Task Surface

Prefer a small set of stable commands. If the project already has `Makefile`,
`Rakefile`, package scripts, or framework commands, wrap them instead of
replacing them.

Recommended task names:

- `setup`: install dependencies and local development hooks.
- `dev`: start the local app or service.
- `build`: build production or distributable artifacts.
- `format`: write formatting changes.
- `format:check`: check formatting without writing.
- `lint`: run lint checks.
- `lint:fix`: optional, write lint fixes when the ecosystem supports it.
- `typecheck`: run type checks when the project has a real type system.
- `check`: fast confidence gate, normally `format:check`, `lint`, and
  `typecheck`.
- `test`: run the normal test suite or default unit tests.
- `verify`: broader pre-handoff or CI-like validation.
- `doctor`: inspect missing tools, env, secrets, or local services.
- `clean`: remove build outputs or local temp state.

Use `mise` when a project needs a cross-language task surface or tool version
pinning. Let `mise` run the existing commands so humans and agents share the
same entry points.

When `mise` owns project tools, make `setup` start with `mise install` so fresh
clones install missing runtimes and CLIs before project commands run. If the
repo already has idiomatic version files such as `.node-version`,
`.ruby-version`, or `.python-version`, consider enabling mise's idiomatic
version-file setting for those tools instead of duplicating versions.

## Validation Tiers

- **Targeted**: changed-package checks, focused tests, or commands named in the
  local docs. Use during normal work.
- **Check**: fast deterministic project confidence. Use before handoff for most
  small changes.
- **Verify**: full or near-CI validation. Use for broad, risky, release-facing,
  or final work when local instructions do not discourage it.

Respect project instructions that say full suites are slow or should be avoided
unless explicitly needed.

## Local Hooks

Use hooks for fast local sensors only.

Good pre-commit candidates:

- format staged files
- lint staged files
- check simple generated-file freshness
- block obvious secrets or invalid metadata

Avoid pre-push hooks by default. They interrupt flow at the wrong time and make
long checks feel punitive. Let agents run longer checks while working, or let CI
handle them.

When using Lefthook, prefer staged-file commands and only enable auto-staging
for tools whose write behavior is predictable, such as formatters. Prefer
installing Lefthook through the project's runtime as a dev dependency when that
fits the ecosystem, such as an npm package or Ruby gem. Use mise for Lefthook
when the project does not have a suitable runtime-level dependency path or wants
a shared cross-language tool pin.

## CI and Workflow Hardening

For GitHub Actions projects, expect a local workflow-check task unless the repo
has a documented reason not to support one. Standard checks are:

- `actionlint` for workflow syntax and expression checks
- `zizmor --offline .` for GitHub Actions security findings
- `pinact` for pinning, checking, updating, and verifying action versions
- full-length SHA pins for third-party actions where practical
- restricted `GITHUB_TOKEN` permissions

Map CI jobs to local commands where possible. If a job is CI-only, say so in the
agent docs.

It is fine to standardize `actionlint`, `zizmor`, and `pinact` as mise-managed
tools because they are project-level CI/workflow utilities rather than runtime
package dependencies.

Use `actionlint` default discovery instead of a narrow workflow glob so `.yml`
and `.yaml` files stay covered. Run `zizmor` offline by default for local agent
loops; use online or token-backed checks only when the repo documents that need.

## Tool Surface Hygiene

Treat tool and MCP sprawl as a harness risk. Tool names, descriptions, schemas,
and MCP server instructions become trusted agent context, so broad or
overlapping tools can lower reliability and increase prompt-injection exposure.

Prefer:

- a few focused tools with clear names and non-overlapping purposes
- project-local CLIs and scripts that agents can inspect
- MCP servers from trusted sources with narrow permissions
- documented reasons for each installed MCP or broad tool integration
- removing stale tools when equivalent project-local commands exist

Avoid:

- installing broad MCP servers just in case
- exposing tools that can mutate external systems without clear need
- keeping multiple tools that answer the same question differently
- vague tool descriptions that do not say when or why to use the tool

When recommending a new tool, include why the existing task surface is
insufficient and what agent failure the tool is meant to prevent.

## Dependency Intake

Treat supply-chain hardening as a default audit category.

Recommend a 3-7 day cooldown window, defaulting to 7 days unless the project has
a clear need for a shorter window. Use explicit per-tool or per-package
exceptions for urgent security updates or high-churn internal tooling.

Prefer native package-manager controls:

- mise: `minimum_release_age = "7d"` in `mise.toml`
- pnpm: `minimumReleaseAge` in `pnpm-workspace.yaml`
- Bun: `install.minimumReleaseAge` in `bunfig.toml`
- Bundler: `cooldown:` on public `Gemfile` sources or project config
- npm: `min-release-age` where supported by the pinned npm version

Document escape hatches for urgent security fixes. Do not remove cooldown policy
just to take one urgent dependency; use the package manager's one-off override
when available.

## Optional GitNexus

Recommend GitNexus only when it is worth the extra index:

- the repo is large or unfamiliar
- impact analysis matters before refactoring
- call graphs or execution flows are hard to infer with `rg`
- agents repeatedly miss where behavior actually lives
- architecture docs are absent or stale

Do not install or index GitNexus unless the user asks. If it already exists,
checking index freshness can be part of the audit.

If the user asks to manage GitNexus with mise, install it through the npm
backend with Bun trust enabled. This requires `node`, `bun`, mise's npm package
manager set to `bun`, and `bun_args = "--trust"` on the `npm:gitnexus` tool.
