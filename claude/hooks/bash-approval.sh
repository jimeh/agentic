#!/usr/bin/env bash

# Thin wrapper for the bash-approval-hook Go binary.
# If the compiled binary exists, exec it; otherwise exit
# silently so the normal permission flow proceeds.

SCRIPT_DIR="$(cd "$(dirname "$(realpath "$0")")" && pwd)"
BINARY="${SCRIPT_DIR}/../bash-approval-hook/bash-approval-hook-debug"

if [[ -x "$BINARY" ]]; then exec "$BINARY"; fi
exit 0
