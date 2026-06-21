# GitHub Actions Tooling

Use this when GitHub Actions workflows exist and the repo needs local workflow
validation.

## Tools via mise

```toml
[tools]
actionlint = "latest"
pinact = "latest"
zizmor = "latest"
```

## Workflow Check Task

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
