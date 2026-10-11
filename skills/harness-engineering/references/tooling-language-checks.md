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

## Dockerfile Checks

```toml
[tools]
hadolint = "latest"

[tasks."lint:docker"]
description = "Lint Dockerfiles"
run = "hadolint Dockerfile"

[tasks."lint:docker:build"]
description = "Run Docker build checks"
run = "docker build --check ."
```

Run `hadolint` with every Dockerfile as an argument, because it does not search
directories:

```sh
hadolint Dockerfile docker/Dockerfile.dev
git ls-files -z -- '*Dockerfile*' '*Containerfile*' | xargs -0 hadolint
```

It exits non-zero when any finding is at `info` severity or above. Pass
`--failure-threshold warning` or `error` to raise that bar. It runs ShellCheck
on `RUN` instructions, so they need no separate shell lint. Record accepted
exceptions in `.hadolint.yaml` or an inline `# hadolint ignore=<rule>` comment
above the instruction.

Run `docker build --check` once per Dockerfile, passing the build context and
using `-f` for any file not named `Dockerfile` at the context root:

```sh
docker build --check .
docker build --check -f docker/Dockerfile.dev .
```

It evaluates BuildKit's build checks without building the image and exits
non-zero on any warning. It reports issues `hadolint` does not, such as
inconsistent instruction casing, so run both. To accept a rule, add a
`# check=skip=<Rule>` directive at the top of the Dockerfile.

`docker build --check` needs a running Docker builder and looks up base image
metadata, so keep it in a separate task from `hadolint` and include it in
`check` only where every environment that runs `check` has Docker. Otherwise run
it in `verify` or CI.

Image and configuration scanners such as `trivy` and `dockle` are security
scans. Place them in `verify` or CI instead of the lint tasks.

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
