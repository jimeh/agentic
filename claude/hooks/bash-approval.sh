#!/usr/bin/env bash

# Thin wrapper for the bash-approval-hook Go binary.
# If the compiled binary exists, exec it; otherwise exit
# silently so the normal permission flow proceeds.

# Resolve through symlinks to find the real script location,
# then locate the binary relative to it.
resolve_link() {
  "$(command -v greadlink || command -v readlink)" "$1"
}

abs_dirname() {
  local path="$1"
  local name
  local cwd
  cwd="$(pwd)"
  while [ -n "$path" ]; do
    cd "${path%/*}" || exit 1
    name="${path##*/}"
    path="$(resolve_link "$name" || true)"
  done
  pwd
  cd "$cwd" || exit 1
}

SCRIPT_DIR="$(abs_dirname "$0")"
BINARY="${SCRIPT_DIR}/../bash-approval-hook/bash-approval-hook"

[[ -x "$BINARY" ]] && exec "$BINARY" || exit 0
