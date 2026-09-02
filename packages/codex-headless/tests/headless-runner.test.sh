#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
runner="$repo_root/packages/codex-headless/bin/codex-headless.ts"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/codex-headless-test.XXXXXX")"
fake_bin="$test_root/bin"
capture_dir="$test_root/capture"

cleanup() {
  rm -rf "$test_root"
}
trap cleanup EXIT

mkdir -p "$fake_bin" "$capture_dir"

# Emits the event shapes observed from codex-cli 0.152.1 `codex exec --json`.
cat > "$fake_bin/codex" <<'FAKE_CODEX'
#!/usr/bin/env bash

set -euo pipefail

run_id="${FAKE_RUN_ID:?}"
capture_dir="${FAKE_CAPTURE_DIR:?}"
printf '%s\n' "$@" > "$capture_dir/$run_id.args"
if [[ "${@: -1}" == "-" ]]; then
  cat > "$capture_dir/$run_id.stdin"
else
  : > "$capture_dir/$run_id.stdin"
fi

output=""
for ((i = 1; i <= $#; i++)); do
  if [[ "${!i}" == "-o" ]]; then
    next=$((i + 1))
    output="${!next}"
  fi
done

printf '%s\n' "{\"type\":\"thread.started\",\"thread_id\":\"thread-$run_id\"}"

case "${FAKE_MODE:-success}" in
  failure)
    printf '%s\n' \
      '{"type":"turn.started"}' \
      '{"type":"error","message":"model rejected"}' \
      '{"type":"turn.failed","error":{"message":"model rejected"}}'
    exit 1
    ;;
  turn-failed)
    printf '%s\n' \
      '{"type":"turn.started"}' \
      '{"type":"turn.failed","error":{"message":"quota exhausted"}}'
    exit 0
    ;;
  malformed)
    printf '{not json}\n'
    exit 0
    ;;
  empty)
    printf '%s\n' '{"type":"turn.started"}' '{"type":"turn.completed","usage":{}}'
    : > "$output"
    exit 0
    ;;
esac

printf '%s\n' \
  '{"type":"turn.started"}' \
  '{"type":"item.started","item":{"id":"item_0","type":"command_execution","command":"/bin/zsh -lc '"'"'cat secret.txt'"'"'","aggregated_output":"","exit_code":null,"status":"in_progress"}}' \
  '{"type":"item.completed","item":{"id":"item_0","type":"command_execution","command":"/bin/zsh -lc '"'"'cat secret.txt'"'"'","aggregated_output":"secret output\n","exit_code":0,"status":"completed"}}' \
  "{\"type\":\"item.completed\",\"item\":{\"id\":\"item_1\",\"type\":\"agent_message\",\"text\":\"answer for $run_id\"}}" \
  '{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":5}}'
printf 'answer for %s\n' "$run_id" > "$output"
printf 'diagnostic for %s\n' "$run_id" >&2
FAKE_CODEX
chmod +x "$fake_bin/codex"

run_headless() {
  local run_id="$1"
  shift
  local artifact_dir="$test_root/artifacts-$run_id"

  printf 'prompt for %s\n' "$run_id" |
    PATH="$fake_bin:$PATH" \
    FAKE_CAPTURE_DIR="$capture_dir" \
    FAKE_RUN_ID="$run_id" \
    "$runner" \
      --artifact-dir "$artifact_dir" \
      "$@" \
      > "$capture_dir/$run_id.stdout" \
      2> "$capture_dir/$run_id.runner-stderr"
}

run_headless_status() {
  local run_id="$1"
  local mode="$2"
  shift 2
  local artifact_dir="$test_root/artifacts-$run_id"

  # Callers disable errexit or test the status directly.
  printf 'prompt for %s\n' "$run_id" |
    PATH="$fake_bin:$PATH" \
    FAKE_CAPTURE_DIR="$capture_dir" \
    FAKE_RUN_ID="$run_id" \
    FAKE_MODE="$mode" \
    "$runner" \
      --artifact-dir "$artifact_dir" \
      "$@" \
      > "$capture_dir/$run_id.stdout" \
      2> "$capture_dir/$run_id.runner-stderr"
}

file_mode() {
  stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"
}

args_has() {
  grep -Fx -- "$2" "$capture_dir/$1.args" >/dev/null
}

args_lacks() {
  if grep -Fx -- "$2" "$capture_dir/$1.args" >/dev/null; then
    echo "$1: unexpected argument $2" >&2
    exit 1
  fi
}

run_headless default

[[ "$(sed -n '1p;2p' "$capture_dir/default.args" | tr '\n' ' ')" == "exec --json " ]]
args_has default '-o'
args_has default "$test_root/artifacts-default/result.md"
args_has default 'sandbox_mode="read-only"'
args_has default '-'
args_lacks default '--ephemeral'
args_lacks default '-s'
args_lacks default '-m'
grep -Fx 'prompt for default' "$capture_dir/default.stdin" >/dev/null
grep -F '"type":"thread.started"' "$test_root/artifacts-default/events.ndjson" >/dev/null
grep -F '"type":"turn.completed"' "$test_root/artifacts-default/events.ndjson" >/dev/null
grep -Fx 'answer for default' "$test_root/artifacts-default/result.md" >/dev/null
grep -F 'session thread-default started' "$test_root/artifacts-default/progress.log" >/dev/null
grep -F 'command_execution started' "$test_root/artifacts-default/progress.log" >/dev/null
grep -F 'command_execution completed (exit 0)' "$test_root/artifacts-default/progress.log" >/dev/null
grep -F 'agent_message completed' "$test_root/artifacts-default/progress.log" >/dev/null
grep -F 'turn completed' "$test_root/artifacts-default/progress.log" >/dev/null
if grep -F 'secret' "$test_root/artifacts-default/progress.log" >/dev/null; then
  echo "progress log leaked command text or output" >&2
  exit 1
fi
if grep -F 'answer for default' "$test_root/artifacts-default/progress.log" >/dev/null; then
  echo "progress log leaked agent message text" >&2
  exit 1
fi
grep -F 'diagnostic for default' "$test_root/artifacts-default/stderr.log" >/dev/null
grep -F '"status": "succeeded"' "$test_root/artifacts-default/run.json" >/dev/null
grep -F '"sessionId": "thread-default"' "$test_root/artifacts-default/run.json" >/dev/null
grep -F '"mode": "exec"' "$test_root/artifacts-default/run.json" >/dev/null
grep -F '"sandbox": "read-only"' "$test_root/artifacts-default/run.json" >/dev/null
grep -F '"input_tokens": 10' "$test_root/artifacts-default/run.json" >/dev/null
grep -F 'codex-headless: artifacts:' "$capture_dir/default.runner-stderr" >/dev/null
[[ "$(file_mode "$test_root/artifacts-default")" == "700" ]]
[[ "$(file_mode "$test_root/artifacts-default/events.ndjson")" == "600" ]]
[[ "$(file_mode "$test_root/artifacts-default/result.md")" == "600" ]]

run_headless options --sandbox workspace-write --model gpt-test \
  --effort low --ephemeral -- --add-dir "$test_root/extra" --skip-git-repo-check
args_has options 'sandbox_mode="workspace-write"'
args_has options '-m'
args_has options 'gpt-test'
args_has options 'model_reasoning_effort="low"'
args_has options '--ephemeral'
args_has options '--add-dir'
args_has options "$test_root/extra"
args_has options '--skip-git-repo-check'
grep -F '"ephemeral": true' "$test_root/artifacts-options/run.json" >/dev/null

run_headless resume --resume thread-default --sandbox workspace-write
[[ "$(sed -n '1p;2p;3p' "$capture_dir/resume.args" | tr '\n' ' ')" == "exec resume --json " ]]
[[ "$(tail -n 2 "$capture_dir/resume.args" | tr '\n' ' ')" == "thread-default - " ]]
args_has resume 'sandbox_mode="workspace-write"'
grep -Fx 'prompt for resume' "$capture_dir/resume.stdin" >/dev/null
grep -F '"mode": "resume"' "$test_root/artifacts-resume/run.json" >/dev/null

run_headless review-scope --review -- --uncommitted
[[ "$(sed -n '1p;2p;3p' "$capture_dir/review-scope.args" | tr '\n' ' ')" == "exec review --json " ]]
args_has review-scope '--uncommitted'
[[ "$(tail -n 1 "$capture_dir/review-scope.args")" == "--uncommitted" ]]
[[ ! -s "$capture_dir/review-scope.stdin" ]]

run_headless review-base --review -- --base main
[[ "$(tail -n 1 "$capture_dir/review-base.args")" == "main" ]]

run_headless review-prompt --review
[[ "$(tail -n 1 "$capture_dir/review-prompt.args")" == "-" ]]
grep -Fx 'prompt for review-prompt' "$capture_dir/review-prompt.stdin" >/dev/null

reject() {
  local run_id="$1"
  local expected="$2"
  shift 2
  if run_headless_status "$run_id" success "$@"; then
    echo "$run_id: expected rejection" >&2
    exit 1
  fi
  grep -F -- "$expected" "$capture_dir/$run_id.runner-stderr" >/dev/null
  if [[ -e "$capture_dir/$run_id.args" ]]; then
    echo "$run_id: codex was launched despite rejected arguments" >&2
    exit 1
  fi
}

reject both-modes '--resume and --review cannot be used together' \
  --resume thread-x --review
reject bad-sandbox '--sandbox must be one of' --sandbox nope
reject reserved-option 'runner-owned Codex option cannot follow --: -s' \
  -- -s read-only
reject reserved-cd 'runner-owned Codex option cannot follow --: -C' \
  -- -C "$test_root"
reject reserved-config 'runner-owned Codex config key cannot follow --: sandbox_mode' \
  -- -c 'sandbox_mode="danger-full-access"'

if run_headless_status failure failure; then
  echo "failure: expected nonzero exit" >&2
  exit 1
fi
grep -F '"status": "failed"' "$test_root/artifacts-failure/run.json" >/dev/null
grep -F 'Codex exited with status 1' "$test_root/artifacts-failure/run.json" >/dev/null
grep -F 'error: model rejected' "$test_root/artifacts-failure/progress.log" >/dev/null
[[ ! -s "$test_root/artifacts-failure/result.md" ]]

set +e
run_headless_status turn-failed turn-failed
turn_failed_status=$?
set -e
[[ "$turn_failed_status" == "67" ]]
grep -F 'Codex turn failed: quota exhausted' "$test_root/artifacts-turn-failed/run.json" >/dev/null

set +e
run_headless_status malformed malformed
malformed_status=$?
set -e
[[ "$malformed_status" == "65" ]]
grep -F '{not json}' "$test_root/artifacts-malformed/events.ndjson" >/dev/null

set +e
run_headless_status empty empty
empty_status=$?
set -e
[[ "$empty_status" == "66" ]]
grep -F 'without a nonempty result' "$test_root/artifacts-empty/run.json" >/dev/null

echo "codex headless runner tests passed"
