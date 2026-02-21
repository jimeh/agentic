#!/usr/bin/env bash
# PreToolUse hook: strips redundant git -C <cwd> flags from Bash commands.
# When Claude runs "git -C /current/dir status" and the cwd is already
# /current/dir, this hook rewrites the command to just "git status".
set -euo pipefail

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
CWD=$(echo "$INPUT" | jq -r '.cwd')

# Quick check: skip if no -C flag present
if [[ "$COMMAND" != *"-C"* ]]; then
  exit 0
fi

# Normalize CWD: strip trailing slash
CWD="${CWD%/}"

# Escape CWD for use in sed extended regex
# shellcheck disable=SC2016
ESCAPED_CWD=$(printf '%s\n' "$CWD" | sed 's/[.[\/*^$()+?{|\\]/\\&/g')

# Replace all forms of git -C <cwd> with just "git".
# Order: quoted forms first (most specific), then =, bare, space-separated.
# Each pattern allows an optional trailing slash on the path.
# Mid-string patterns (followed by whitespace) replace with "git ".
# End-of-string patterns replace with "git".
UPDATED=$(printf '%s' "$COMMAND" | sed -E \
  -e "s|git[[:space:]]+-C[[:space:]]+\"${ESCAPED_CWD}/?\"[[:space:]]+|git |g" \
  -e "s|git[[:space:]]+-C[[:space:]]+'${ESCAPED_CWD}/?'[[:space:]]+|git |g" \
  -e "s|git[[:space:]]+-C=${ESCAPED_CWD}/?[[:space:]]+|git |g" \
  -e "s|git[[:space:]]+-C${ESCAPED_CWD}/?[[:space:]]+|git |g" \
  -e "s|git[[:space:]]+-C[[:space:]]+${ESCAPED_CWD}/?[[:space:]]+|git |g" \
  -e "s|git[[:space:]]+-C[[:space:]]+\"${ESCAPED_CWD}/?\"$|git|g" \
  -e "s|git[[:space:]]+-C[[:space:]]+'${ESCAPED_CWD}/?'$|git|g" \
  -e "s|git[[:space:]]+-C=${ESCAPED_CWD}/?$|git|g" \
  -e "s|git[[:space:]]+-C${ESCAPED_CWD}/?$|git|g" \
  -e "s|git[[:space:]]+-C[[:space:]]+${ESCAPED_CWD}/?$|git|g" \
)

# If nothing changed, allow as-is
if [[ "$COMMAND" == "$UPDATED" ]]; then
  exit 0
fi

# Return the modified command
jq -n --arg cmd "$UPDATED" \
  '{ "hookSpecificOutput": { "updatedInput": { "command": $cmd } } }'
