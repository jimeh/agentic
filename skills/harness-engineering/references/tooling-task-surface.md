# Tooling Task Surface

Use these when a project needs standard task names or `mise` tool/version
coordination.

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
`.ruby-version`, or `.python-version` and you want mise to respect them. This is
an early-init setting, so configure it in global mise config such as
`~/.config/mise/config.toml`, not project-level `mise.toml`.

```toml
[settings]
minimum_release_age = "7d"
idiomatic_version_file_enable_tools = ["node", "ruby", "python"]
```

Enable only the tools the repo actually uses. Do not enable `.python-version`
for projects where another tool, such as `uv`, owns that file. Project-level
`mise.toml` is read too late for this setting to affect idiomatic version-file
discovery.
