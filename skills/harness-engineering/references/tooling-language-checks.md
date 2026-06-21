# Language Check Snippets

Use these when adding language-specific format, lint, or test tasks.

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
