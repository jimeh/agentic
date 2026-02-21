#!/usr/bin/env bash

# Thin wrapper for the bash-approval-hook Go binary.
# If the compiled binary exists, exec it; otherwise exit
# silently so the normal permission flow proceeds.

SCRIPT_DIR="$(cd "$(dirname "$(realpath "$0")")" && pwd)"
HOOK_DIR="${SCRIPT_DIR}/../bash-approval-hook"

if [[ -x "${HOOK_DIR}/bash-approval-hook" ]]; then
  exec "${HOOK_DIR}/bash-approval-hook"
fi
if [[ -x "${HOOK_DIR}/bash-approval-hook-debug" ]]; then
  exec "${HOOK_DIR}/bash-approval-hook-debug"
fi
exit 0
