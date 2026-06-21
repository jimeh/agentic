# Tooling Snippets

Use these as starting points. Adapt to the existing package manager, task
runner, and project conventions.

## mise Task Wrapper

```toml
[settings]
minimum_release_age = "7d"

[tasks.setup]
description = "Install dependencies and local git hooks"
run = [
  "mise install",
  "pnpm install --frozen-lockfile",
  "pnpm exec lefthook install",
]

[tasks.format]
description = "Format files"
run = "pnpm prettier --write ."

[tasks."format:check"]
description = "Check formatting"
run = "pnpm prettier --check ."

[tasks.lint]
description = "Run lint checks"
run = "pnpm eslint ."

[tasks.typecheck]
description = "Run type checks"
run = "pnpm tsc --noEmit"

[tasks.check]
description = "Run fast local checks"
depends = ["format:check", "lint", "typecheck"]

[tasks.test]
description = "Run tests"
run = "pnpm test"

[tasks.verify]
description = "Run broad pre-handoff checks"
depends = ["check", "test"]
```

If the repo already has `make check`, `rake test`, or package scripts, wrap
those commands instead of duplicating their internals.

Use a 3-7 day dependency cooldown by default. Prefer 7 days unless the project
has high-churn internal tooling or time-sensitive security tooling.

## mise Idiomatic Version Files

Use this when the repo already has files such as `.node-version`,
`.ruby-version`, or `.python-version` and you want mise to respect them.

```toml
[settings]
minimum_release_age = "7d"
idiomatic_version_file_enable_tools = ["node", "ruby", "python"]
```

Enable only the tools the repo actually uses. Do not enable `.python-version`
for projects where another tool, such as `uv`, owns that file.

## Claude Code Compatibility

```markdown
@AGENTS.md
```

Write that as the complete contents of root `CLAUDE.md` next to `AGENTS.md`.

For project-local skills:

```bash
mkdir -p .agents/skills .claude
ln -s ../.agents/skills .claude/skills
```

If `.claude/skills` already exists, inspect it before replacing it. Preserve or
migrate any project-local skills that are not already in `.agents/skills`.

## GitNexus via mise

Use this only when the user asks to add GitNexus. Set mise's npm package manager
to `bun`; `aube` and `pnpm` do not currently work correctly for this tool.

```toml
[tools]
node = "latest"
bun = "latest"

[settings.npm]
package_manager = "bun"

[tools."npm:gitnexus"]
version = "latest"
bun_args = "--trust"
```

## GitHub Actions Tools via mise

Standardize these through mise when GitHub Actions workflows exist:

```toml
[tools]
actionlint = "latest"
pinact = "latest"
zizmor = "latest"
```

## Lefthook Pre-Commit

Prefer installing Lefthook as a project dev dependency when available:

```toml
[tasks.setup]
description = "Install dependencies and local git hooks"
run = [
  "mise install",
  "pnpm install --frozen-lockfile",
  "pnpm exec lefthook install",
]
```

Use mise when there is no suitable project dependency path:

```toml
[tools]
lefthook = "latest"

[tasks.setup]
description = "Install dependencies and local git hooks"
run = [
  "mise install",
  "pnpm install --frozen-lockfile",
  "lefthook install",
]
```

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: format
      run: mise exec -- pnpm exec prettier --write {staged_files}
      glob:
        - "*.{js,jsx,ts,tsx,json,md,yml,yaml}"
      stage_fixed: true

    - name: lint
      run: mise exec -- pnpm exec eslint {staged_files}
      glob:
        - "*.{js,jsx,ts,tsx}"
```

Keep pre-commit fast. Avoid pre-push hooks by default.

## pnpm Release Age

Default to 7 days. Use 3 days only when project constraints justify faster
intake.

```yaml
minimumReleaseAge: 10080 # 7 days
minimumReleaseAgeExclude:
  - "@myorg/*"
```

Use a shorter window when the project depends on high-churn internal tooling.

## Bun Release Age

Default to 7 days.

```toml
[install]
minimumReleaseAge = 604800 # 7 days, seconds
minimumReleaseAgeExcludes = ["@types/bun", "typescript"]
```

## Bundler Cooldown

Default to 7 days.

```ruby
source "https://rubygems.org", cooldown: 7

source "https://gems.internal.example.com", cooldown: 0 do
  gem "internal-tool"
end
```

For urgent security updates, prefer a one-off `--cooldown 0` command instead of
removing the policy.

## GitHub Actions Checks

```toml
[tools]
actionlint = "latest"
pinact = "latest"
zizmor = "latest"

[tasks."ci:workflows"]
description = "Check GitHub Actions workflows"
run = [
  "actionlint",
  "zizmor --offline .",
  "pinact run -check",
]
```

Use mise for `actionlint`, `zizmor`, and `pinact` so workflow checks are
available before project dependencies are installed.

## Shell Checks

```toml
[tools]
shellcheck = "latest"
shfmt = "latest"

[tasks."format:shell"]
description = "Format shell scripts"
run = "shfmt -w ."

[tasks."lint:shell"]
description = "Lint shell scripts"
run = "shellcheck **/*.sh"
```

Use the repo's existing shell file discovery if the glob is not portable in the
project shell.

## Python Checks

```toml
[tools]
ruff = "latest"
uv = "latest"

[tasks."format:python"]
description = "Format Python files"
run = "ruff format ."

[tasks."lint:python"]
description = "Lint Python files"
run = "ruff check ."

[tasks."test:python"]
description = "Run Python tests"
run = "uv run pytest"
```

Prefer the project's existing environment manager if it already owns Python
installation and dependency resolution.

## Rust Checks

```toml
[tasks."format:rust"]
description = "Check Rust formatting"
run = "cargo fmt --all -- --check"

[tasks."lint:rust"]
description = "Run Rust lints"
run = "cargo clippy --all-targets --all-features -- -D warnings"

[tasks."test:rust"]
description = "Run Rust tests"
run = "cargo test --all-targets --all-features"
```

## Go Checks

```toml
[tasks."format:go"]
description = "Check Go formatting"
run = "test -z \"$(gofmt -l .)\""

[tasks."lint:go"]
description = "Run Go static checks"
run = "go vet ./..."

[tasks."test:go"]
description = "Run Go tests"
run = "go test ./..."
```

Use `goimports` instead of `gofmt` when import grouping and pruning should be
part of the formatter gate. Add `gofumpt` after `gofmt` or `goimports` when the
project wants a stricter Go formatting profile.

## Ruby Checks

```toml
[tasks."format:ruby"]
description = "Check Ruby formatting"
run = "bundle exec rubocop --format simple"

[tasks."lint:ruby"]
description = "Run Ruby lints"
run = "bundle exec rubocop"

[tasks."test:ruby"]
description = "Run Ruby tests"
run = "bundle exec rspec"
```

Split format and lint only when the project uses separate Ruby tools. Many
projects use RuboCop for both.
