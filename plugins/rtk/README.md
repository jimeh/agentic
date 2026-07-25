# rtk

Claude Code plugin that routes Bash commands through rtk (Rust Token Killer), a
token-optimizing CLI proxy.

## Problem

Many development commands produce far more output than an agent needs. rtk wraps
them and filters the result, cutting token usage substantially on common
operations like `git status`, `cargo test`, and `npm run build`.

rtk ships an installer (`rtk init`) that patches this hook directly into
`~/.claude/settings.json`. That file is managed by this repository, so a tool
writing into it creates drift between the checkout and what is installed.
Packaging the hook as a plugin keeps the wiring version-controlled and lets
`rtk init` stay out of settings entirely.

## What It Does

A `PreToolUse` hook intercepts Bash tool calls and hands the command to
`rtk hook claude`, which rewrites it to run under rtk — `git status` becomes
`rtk git status`. The rewrite is transparent and adds no token overhead.

If rtk is not on `PATH`, the hook exits cleanly and the command runs unchanged.
rtk is often installed through a version manager, so it may be absent from the
environment a non-interactive hook inherits; failing open keeps every Bash tool
call working.

## Requirements

`rtk` on `PATH`. Verify with:

```bash
rtk --version
rtk gain          # token savings analytics
```

Note the name collision: `reachingforthejack/rtk` (Rust Type Kit) is a different
tool. If `rtk gain` fails, you likely have that one installed.

## Install

```bash
# Add the marketplace (once)
claude plugin marketplace add jimeh/agentic

# Install the plugin
claude plugin install rtk@jimeh-agentic
```

Or from within Claude Code:

```text
/plugin marketplace add jimeh/agentic
/plugin install rtk@jimeh-agentic
```
