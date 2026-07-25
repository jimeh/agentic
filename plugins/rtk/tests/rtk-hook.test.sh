#!/usr/bin/env bash
# Tests for the rtk hook wrapper.
# Run: bash tests/rtk-hook.test.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="${SCRIPT_DIR}/../hooks/rtk-hook.sh"

PASS=0
FAIL=0

STUB_DIR="$(mktemp -d)"
trap 'rm -rf "$STUB_DIR"' EXIT

# Stand in for rtk so the tests never depend on a real installation.
cat > "${STUB_DIR}/rtk" << 'STUB'
#!/bin/sh
if [ "$1 $2" = "hook claude" ]; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse"}}'
  exit 0
fi
echo "unexpected rtk args: $*" >&2
exit 1
STUB
chmod +x "${STUB_DIR}/rtk"

check() {
  local desc="$1" expected_status="$2" expected_output="$3"
  local path="$4"

  local input output status
  input='{"tool_input":{"command":"git status"},"cwd":"/tmp"}'

  set +e
  output=$(printf '%s' "$input" | env PATH="$path" bash "$HOOK" 2>&1)
  status=$?
  set -e

  if [[ "$status" -ne "$expected_status" ]]; then
    echo "  FAIL: ${desc} (exit ${status}, want ${expected_status})"
    FAIL=$((FAIL + 1))
    return
  fi

  if [[ "$expected_output" == "--empty" ]]; then
    if [[ -n "$output" ]]; then
      echo "  FAIL: ${desc} (expected no output, got: ${output})"
      FAIL=$((FAIL + 1))
      return
    fi
  elif [[ "$output" != *"$expected_output"* ]]; then
    echo "  FAIL: ${desc} (output: ${output})"
    FAIL=$((FAIL + 1))
    return
  fi

  echo "  PASS: ${desc}"
  PASS=$((PASS + 1))
}

echo "rtk hook wrapper:"
check "delegates to rtk when available" \
  0 "hookSpecificOutput" "${STUB_DIR}:/usr/bin:/bin"

# A missing rtk must not break unrelated Bash tool calls. rtk is commonly
# installed through a version manager, so it may be absent from the PATH a
# non-interactive hook inherits.
check "exits cleanly when rtk is missing" \
  0 "--empty" "/usr/bin:/bin"

echo ""
echo "========================"
echo "Results: ${PASS} passed, ${FAIL} failed"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
