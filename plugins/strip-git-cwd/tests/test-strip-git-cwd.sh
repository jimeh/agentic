#!/usr/bin/env bash
# Tests for the strip-git-cwd hook script.
# Run from the plugin root: bash tests/test-strip-git-cwd.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="${SCRIPT_DIR}/../hooks/strip-git-cwd.sh"

PASS=0
FAIL=0

# Run a test case. When the command should be modified, expect_cmd is the
# expected output command. When nothing should change, pass "--unchanged".
run_test() {
  local desc="$1" cmd="$2" cwd="$3" expect="$4"

  local input
  input=$(jq -n \
    --arg cmd "$cmd" \
    --arg cwd "$cwd" \
    '{
      session_id: "test",
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: $cmd },
      cwd: $cwd
    }')

  local output exit_code
  set +eo pipefail
  output=$(echo "$input" | bash "$HOOK" 2>&1)
  exit_code=$?
  set -eo pipefail

  if [[ "$expect" == "--unchanged" ]]; then
    # Expect no output and exit 0
    if [[ -z "$output" && "$exit_code" -eq 0 ]]; then
      echo "  PASS: ${desc}"
      PASS=$((PASS + 1))
    else
      echo "  FAIL: ${desc}"
      echo "    expected: (no output, exit 0)"
      echo "    got output: ${output:-<empty>}"
      echo "    got exit: ${exit_code}"
      FAIL=$((FAIL + 1))
    fi
  else
    # Expect JSON output with updated command
    local actual
    actual=$(echo "$output" | jq -r \
      '.hookSpecificOutput.updatedInput.command // empty' 2>/dev/null)
    if [[ "$actual" == "$expect" ]]; then
      echo "  PASS: ${desc}"
      PASS=$((PASS + 1))
    else
      echo "  FAIL: ${desc}"
      echo "    expected: ${expect}"
      echo "    got:      ${actual:-<empty>}"
      FAIL=$((FAIL + 1))
    fi
  fi
}

echo "strip-git-cwd hook tests"
echo "========================"
echo ""

echo "Commands that should be stripped:"
run_test "basic -C <path>" \
  "git -C /foo/bar status" "/foo/bar" \
  "git status"

run_test "trailing slash on path" \
  "git -C /foo/bar/ log" "/foo/bar" \
  "git log"

run_test "trailing slash on cwd" \
  "git -C /foo/bar status" "/foo/bar/" \
  "git status"

run_test "-C= form" \
  "git -C=/foo/bar status" "/foo/bar" \
  "git status"

run_test "-C (bare/no separator)" \
  "git -C/foo/bar status" "/foo/bar" \
  "git status"

run_test "double-quoted path" \
  'git -C "/foo/bar" status' "/foo/bar" \
  "git status"

run_test "single-quoted path" \
  "git -C '/foo/bar' status" "/foo/bar" \
  "git status"

run_test "-C at end of string" \
  "git -C /foo/bar" "/foo/bar" \
  "git"

run_test "compound && command" \
  'git -C /foo/bar add . && git -C /foo/bar commit -m "msg"' "/foo/bar" \
  'git add . && git commit -m "msg"'

run_test "compound ; command" \
  "git -C /foo/bar status; git -C /foo/bar log" "/foo/bar" \
  "git status; git log"

run_test "path with dots" \
  "git -C /foo/bar.baz status" "/foo/bar.baz" \
  "git status"

echo ""
echo "Commands that should NOT be stripped:"
run_test "different path" \
  "git -C /other/dir status" "/foo/bar" \
  "--unchanged"

run_test "non-git command" \
  "ls -la" "/foo/bar" \
  "--unchanged"

run_test "git without -C" \
  "git status" "/foo/bar" \
  "--unchanged"

run_test "-C with longer path (not cwd)" \
  "git -C /foo/bar/baz status" "/foo/bar" \
  "--unchanged"

echo ""
echo "========================"
echo "Results: ${PASS} passed, ${FAIL} failed"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
