#!/usr/bin/env bash
# PreToolUse hook: strips redundant cwd references from Bash git commands.
# Handles two patterns Claude uses:
#   1. "cd /current/dir && git ..." → "git ..."
#   2. "git -C /current/dir status" → "git status"
set -euo pipefail

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
CWD=$(echo "$INPUT" | jq -r '.cwd')

# Quick check: skip if neither pattern is present
if [[ "$COMMAND" != *"-C"* && "$COMMAND" != cd\ * ]]; then
  exit 0
fi

# Normalize CWD: strip trailing slash
CWD="${CWD%/}"

# Escape CWD for use in sed extended regex
# shellcheck disable=SC2016
ESCAPED_CWD=$(printf '%s\n' "$CWD" | sed 's/[.[\/*^$()+?{|\\]/\\&/g')

UPDATED="$COMMAND"

# Strip "cd <cwd> && git" or "cd <cwd>; git" prefix.
# Only when the next command is git. Quoted and unquoted path forms,
# with optional trailing slash.
if [[ "$UPDATED" == cd\ * ]]; then
  UPDATED=$(
    printf '%s' "$UPDATED" | sed -E \
      -e "s|^cd[[:space:]]+\"${ESCAPED_CWD}/?\"[[:space:]]*&&[[:space:]]*(git[[:space:]])|\1|" \
      -e "s|^cd[[:space:]]+'${ESCAPED_CWD}/?'[[:space:]]*&&[[:space:]]*(git[[:space:]])|\1|" \
      -e "s|^cd[[:space:]]+${ESCAPED_CWD}/?[[:space:]]*&&[[:space:]]*(git[[:space:]])|\1|" \
      -e "s|^cd[[:space:]]+\"${ESCAPED_CWD}/?\"[[:space:]]*;[[:space:]]*(git[[:space:]])|\1|" \
      -e "s|^cd[[:space:]]+'${ESCAPED_CWD}/?'[[:space:]]*;[[:space:]]*(git[[:space:]])|\1|" \
      -e "s|^cd[[:space:]]+${ESCAPED_CWD}/?[[:space:]]*;[[:space:]]*(git[[:space:]])|\1|"
  )
fi

# Strip git -C <cwd> flags from anywhere in the command.
# Order: quoted forms first (most specific), then =, bare, space-separated.
# Each pattern allows an optional trailing slash on the path.
# Mid-string patterns (followed by whitespace) replace with "git ".
# End-of-string patterns replace with "git".
if [[ "$UPDATED" == *"-C"* ]]; then
  UPDATED=$(
    printf '%s' "$UPDATED" | sed -E \
      -e "s|git[[:space:]]+-C[[:space:]]+\"${ESCAPED_CWD}/?\"[[:space:]]+|git |g" \
      -e "s|git[[:space:]]+-C[[:space:]]+'${ESCAPED_CWD}/?'[[:space:]]+|git |g" \
      -e "s|git[[:space:]]+-C=${ESCAPED_CWD}/?[[:space:]]+|git |g" \
      -e "s|git[[:space:]]+-C${ESCAPED_CWD}/?[[:space:]]+|git |g" \
      -e "s|git[[:space:]]+-C[[:space:]]+${ESCAPED_CWD}/?[[:space:]]+|git |g" \
      -e "s|git[[:space:]]+-C[[:space:]]+\"${ESCAPED_CWD}/?\"$|git|g" \
      -e "s|git[[:space:]]+-C[[:space:]]+'${ESCAPED_CWD}/?'$|git|g" \
      -e "s|git[[:space:]]+-C=${ESCAPED_CWD}/?$|git|g" \
      -e "s|git[[:space:]]+-C${ESCAPED_CWD}/?$|git|g" \
      -e "s|git[[:space:]]+-C[[:space:]]+${ESCAPED_CWD}/?$|git|g"
  )
fi

# If nothing changed, allow as-is
if [[ "$COMMAND" == "$UPDATED" ]]; then
  exit 0
fi

# Return the modified command
jq -n --arg cmd "$UPDATED" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "updatedInput": {
      "command": $cmd
    }
  }
}'
