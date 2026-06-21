# Hooks and Dependency Policy

Use this when adding local hooks or dependency intake controls.

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
