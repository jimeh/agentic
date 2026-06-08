# Tooling Patterns

Use this when a project needs faster agent feedback, clearer task entry points,
or supply-chain hardening.

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

For GitHub Actions projects, consider:

- `actionlint` for workflow syntax and expression checks
- `pinact` for pinning, checking, updating, and verifying action versions
- full-length SHA pins for third-party actions where practical
- restricted `GITHUB_TOKEN` permissions
- `CODEOWNERS` or focused review for workflow changes

Map CI jobs to local commands where possible. If a job is CI-only, say so in the
agent docs.

It is fine to standardize `actionlint` and `pinact` as mise-managed tools
because they are project-level CI/workflow utilities rather than runtime package
dependencies.

## Dependency Intake

Treat supply-chain hardening as a default audit category.

Prefer native package-manager controls:

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
backend with reviewed build approvals. This requires `node` and an npm package
manager path that supports `allow_builds`, currently `aube` or `pnpm`.
