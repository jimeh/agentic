# Hooks and Dependency Policy

Use this when adding local hooks or dependency intake controls.

## Contents

- [Lefthook Pre-Commit](#lefthook-pre-commit)
- [pnpm Release Age](#pnpm-release-age)
- [Bun Release Age](#bun-release-age)
- [Bundler Cooldown](#bundler-cooldown)

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
lefthook = "2"

[tasks."hooks:install"]
description = "Install local git hooks"
run = "lefthook install"

[tasks.setup]
description = "Install dependencies and local git hooks"
run = [
  "mise install",
  "pnpm install --frozen-lockfile",
  "mise run hooks:install",
]
```

When the repository uses Mise lockfiles, resolve and commit the matching
`mise.lock` entry so the broad version constraint remains reproducible. If it
does not, recommend enabling lockfiles or pin Lefthook more narrowly.

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

Add a whole-project or dependency-aware typecheck job only when it is sound and
consistently fits the measured hook budget. Otherwise keep typechecking in the
canonical `check` task.

Before handoff, verify setup installs the hook in a fresh clone or disposable
worktree, measure a warm representative run, and exercise partial staging plus
spaces or unusual filenames when the configured commands could mishandle them.
Automatic fixes and `stage_fixed` should be limited to predictable formatters.

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
