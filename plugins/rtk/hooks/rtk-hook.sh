#!/usr/bin/env bash
# PreToolUse hook: routes Bash commands through rtk, a token-optimizing CLI
# proxy that rewrites commands like `git status` into `rtk git status`.
#
# rtk is often installed through a version manager, so it is not always on PATH
# for non-interactive hook invocations. Exiting cleanly when it is missing keeps
# every Bash tool call working instead of failing with exit 127.
set -uo pipefail

if ! command -v rtk > /dev/null 2>&1; then
  exit 0
fi

exec rtk hook claude
