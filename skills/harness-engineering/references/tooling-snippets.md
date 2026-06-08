# Tooling Snippets

Use these as starting points. Adapt to the existing package manager, task
runner, and project conventions.

## mise Task Wrapper

```toml
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

## mise Idiomatic Version Files

Use this when the repo already has files such as `.node-version`,
`.ruby-version`, or `.python-version` and you want mise to respect them.

```toml
[settings]
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

Use this only when the user asks to add GitNexus. The npm backend needs `node`
and an npm package manager that supports `allow_builds`, such as `aube` or
`pnpm`.

```toml
[tools]
node = "latest"
aube = "latest"

[settings.npm]
package_manager = "aube"

[tools."npm:gitnexus"]
version = "latest"
allow_builds = ["@ladybugdb/core", "gitnexus", "tree-sitter"]
```

If the project standardizes on pnpm instead of aube:

```toml
[tools]
node = "latest"
pnpm = "latest"

[settings.npm]
package_manager = "pnpm"

[tools."npm:gitnexus"]
version = "latest"
allow_builds = ["@ladybugdb/core", "gitnexus", "tree-sitter"]
```

## GitHub Actions Tools via mise

Standardize these through mise when GitHub Actions workflows exist:

```toml
[tools]
actionlint = "latest"
pinact = "latest"
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

```yaml
minimumReleaseAge: 10080 # 7 days
minimumReleaseAgeExclude:
  - "@myorg/*"
```

Use a shorter window when the project depends on high-churn internal tooling.

## Bun Release Age

```toml
[install]
minimumReleaseAge = 604800 # 7 days, seconds
minimumReleaseAgeExcludes = ["@types/bun", "typescript"]
```

## Bundler Cooldown

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

[tasks."ci:workflows"]
description = "Check GitHub Actions workflows"
run = [
  "actionlint",
  "pinact run -check",
]
```

Use mise for `actionlint` and `pinact` so workflow checks are available before
project dependencies are installed.
