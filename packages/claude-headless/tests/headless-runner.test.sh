#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/claude-headless-test.XXXXXX")"
fake_bin="$test_root/bin"
capture_dir="$test_root/capture"

cleanup() {
  rm -rf "$test_root"
}
trap cleanup EXIT

mkdir -p "$fake_bin" "$capture_dir"

cat > "$fake_bin/claude" <<'FAKE_CLAUDE'
#!/usr/bin/env bash

set -euo pipefail

run_id="${FAKE_RUN_ID:?}"
capture_dir="${FAKE_CAPTURE_DIR:?}"
printf '%s\n' "$@" > "$capture_dir/$run_id.args"
cat > "$capture_dir/$run_id.stdin"

if [[ "${FAKE_MODE:-success}" == "failure" ]]; then
  printf 'fake claude failure\n' >&2
  exit 23
fi

if [[ "${FAKE_MODE:-success}" == "malformed" ]]; then
  printf '{not json}\n'
  exit 0
fi

if [[ "${FAKE_MODE:-success}" == "result-error" ]]; then
  printf '%s\n' '{"type":"result","subtype":"error_during_execution","is_error":true,"result":"partial failure"}'
  exit 0
fi

model="claude-fable-5"
for ((i = 1; i <= $#; i++)); do
  if [[ "${!i}" == "--model" ]]; then
    next=$((i + 1))
    model="${!next}"
  fi
done

printf '%s\n' \
  "{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"session-$run_id\",\"model\":\"$model\"}" \
  '{"type":"assistant","message":{"content":[{"type":"thinking","thinking":"private"},{"type":"tool_use","name":"Read","input":{"file_path":"secret.txt"}}]}}' \
  '{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"tool-1","content":"secret result"}]}}' \
  "{\"type\":\"result\",\"subtype\":\"success\",\"result\":\"explanation for $run_id\",\"session_id\":\"session-$run_id\",\"modelUsage\":{\"$model\":{\"inputTokens\":10,\"outputTokens\":5}}}"
printf 'diagnostic for %s\n' "$run_id" >&2
FAKE_CLAUDE
chmod +x "$fake_bin/claude"

run_headless() {
  local run_id="$1"
  shift
  local artifact_dir="$test_root/artifacts-$run_id"

  printf 'prompt for %s\n' "$run_id" |
    PATH="$fake_bin:$PATH" \
    FAKE_CAPTURE_DIR="$capture_dir" \
    FAKE_RUN_ID="$run_id" \
    "$repo_root/packages/claude-headless/bin/claude-headless.ts" \
      --artifact-dir "$artifact_dir" \
      "$@" \
      > "$capture_dir/$run_id.stdout" \
      2> "$capture_dir/$run_id.runner-stderr"
}

run_headless default

rg -Fx -- '--model' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'claude-fable-5' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--effort' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'high' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--setting-sources' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'user' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--permission-mode' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'plan' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--disallowed-tools' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'Skill(codex-analysis)' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'Skill(codex-computer-use)' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'Skill(codex-first)' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'Skill(codex-implementation)' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'Skill(codex-review)' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--settings' "$capture_dir/default.args" >/dev/null
rg -F '"codex-analysis":"off"' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--output-format' "$capture_dir/default.args" >/dev/null
rg -Fx -- 'stream-json' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--verbose' "$capture_dir/default.args" >/dev/null
rg -Fx -- '--no-session-persistence' "$capture_dir/default.args" >/dev/null
rg -Fx 'prompt for default' "$capture_dir/default.stdin" >/dev/null
rg -F '"type":"system"' "$test_root/artifacts-default/events.ndjson" >/dev/null
rg -F '"type":"result"' "$test_root/artifacts-default/events.ndjson" >/dev/null
rg -Fx 'explanation for default' "$test_root/artifacts-default/result.md" >/dev/null
rg -F 'session session-default started' "$test_root/artifacts-default/progress.log" >/dev/null
rg -F 'tool Read' "$test_root/artifacts-default/progress.log" >/dev/null
rg -F 'completed' "$test_root/artifacts-default/progress.log" >/dev/null
if rg -F 'private' "$test_root/artifacts-default/progress.log" >/dev/null; then
  echo "progress log leaked thinking content" >&2
  exit 1
fi
if rg -F 'secret result' "$test_root/artifacts-default/progress.log" >/dev/null; then
  echo "progress log leaked tool-result content" >&2
  exit 1
fi
rg -F 'diagnostic for default' "$test_root/artifacts-default/stderr.log" >/dev/null
rg -F '"status": "succeeded"' "$test_root/artifacts-default/run.json" >/dev/null
rg -F '"actualModels"' "$test_root/artifacts-default/run.json" >/dev/null
rg -F 'claude-headless: artifacts:' "$capture_dir/default.runner-stderr" >/dev/null
[[ "$(stat -c '%a' "$test_root/artifacts-default")" == "700" ]]
[[ "$(stat -c '%a' "$test_root/artifacts-default/events.ndjson")" == "600" ]]

run_headless opus --model opus --setting-sources user,project \
  --permission-mode auto --session-id 11111111-1111-4111-8111-111111111111

rg -Fx -- 'claude-opus-5' "$capture_dir/opus.args" >/dev/null
rg -Fx -- 'medium' "$capture_dir/opus.args" >/dev/null
rg -Fx -- 'user,project' "$capture_dir/opus.args" >/dev/null
rg -Fx -- 'auto' "$capture_dir/opus.args" >/dev/null
rg -Fx -- '--session-id' "$capture_dir/opus.args" >/dev/null
rg -Fx -- '11111111-1111-4111-8111-111111111111' "$capture_dir/opus.args" >/dev/null
if rg -Fx -- '--no-session-persistence' "$capture_dir/opus.args" >/dev/null; then
  echo "persisted run disabled session persistence" >&2
  exit 1
fi

run_headless resume --resume session-opus
rg -Fx -- '--resume' "$capture_dir/resume.args" >/dev/null
rg -Fx -- 'session-opus' "$capture_dir/resume.args" >/dev/null
if rg -Fx -- '--no-session-persistence' "$capture_dir/resume.args" >/dev/null; then
  echo "resumed run disabled session persistence" >&2
  exit 1
fi

run_headless override --model opus --effort high
rg -Fx -- 'claude-opus-5' "$capture_dir/override.args" >/dev/null
rg -Fx -- 'high' "$capture_dir/override.args" >/dev/null

run_headless custom --model claude-sonnet-5
rg -Fx -- 'claude-sonnet-5' "$capture_dir/custom.args" >/dev/null
if rg -Fx -- '--effort' "$capture_dir/custom.args" >/dev/null; then
  echo "custom model received an inferred effort" >&2
  exit 1
fi

reserved_artifacts="$test_root/artifacts-reserved"
set +e
printf 'reserved prompt\n' |
  PATH="$fake_bin:$PATH" \
  FAKE_CAPTURE_DIR="$capture_dir" \
  FAKE_RUN_ID="reserved" \
  "$repo_root/packages/claude-headless/bin/claude-headless.ts" \
    --artifact-dir "$reserved_artifacts" \
    -- --safe-mode \
    > "$capture_dir/reserved.stdout" \
    2> "$capture_dir/reserved.runner-stderr"
reserved_status=$?
set -e
[[ "$reserved_status" == "2" ]]
rg -F 'runner-owned Claude option cannot follow --: --safe-mode' \
  "$capture_dir/reserved.runner-stderr" >/dev/null

failure_artifacts="$test_root/artifacts-failure"
set +e
printf 'failing prompt\n' |
  PATH="$fake_bin:$PATH" \
  FAKE_CAPTURE_DIR="$capture_dir" \
  FAKE_RUN_ID="failure" \
  FAKE_MODE="failure" \
  "$repo_root/packages/claude-headless/bin/claude-headless.ts" \
    --artifact-dir "$failure_artifacts" \
    > "$capture_dir/failure.stdout" \
    2> "$capture_dir/failure.runner-stderr"
failure_status=$?
set -e
[[ "$failure_status" == "23" ]]
rg -F '"status": "failed"' "$failure_artifacts/run.json" >/dev/null
rg -F 'fake claude failure' "$failure_artifacts/stderr.log" >/dev/null

malformed_artifacts="$test_root/artifacts-malformed"
set +e
printf 'malformed prompt\n' |
  PATH="$fake_bin:$PATH" \
  FAKE_CAPTURE_DIR="$capture_dir" \
  FAKE_RUN_ID="malformed" \
  FAKE_MODE="malformed" \
  "$repo_root/packages/claude-headless/bin/claude-headless.ts" \
    --artifact-dir "$malformed_artifacts" \
    > "$capture_dir/malformed.stdout" \
    2> "$capture_dir/malformed.runner-stderr"
malformed_status=$?
set -e
[[ "$malformed_status" == "65" ]]
rg -F '{not json}' "$malformed_artifacts/events.ndjson" >/dev/null
rg -F '"status": "failed"' "$malformed_artifacts/run.json" >/dev/null

result_error_artifacts="$test_root/artifacts-result-error"
set +e
printf 'result error prompt\n' |
  PATH="$fake_bin:$PATH" \
  FAKE_CAPTURE_DIR="$capture_dir" \
  FAKE_RUN_ID="result-error" \
  FAKE_MODE="result-error" \
  "$repo_root/packages/claude-headless/bin/claude-headless.ts" \
    --artifact-dir "$result_error_artifacts" \
    > "$capture_dir/result-error.stdout" \
    2> "$capture_dir/result-error.runner-stderr"
result_error_status=$?
set -e
[[ "$result_error_status" == "67" ]]
rg -F '"status": "failed"' "$result_error_artifacts/run.json" >/dev/null
rg -F 'Claude result reported error_during_execution' \
  "$result_error_artifacts/run.json" >/dev/null

PATH="$fake_bin:$PATH" \
  FAKE_CAPTURE_DIR="$capture_dir" \
  FAKE_RUN_ID="fable-wrapper" \
  FABLE_API_KEY="test" \
  "$repo_root/bin/fable" < /dev/null >/dev/null 2>/dev/null
rg -Fx -- 'claude-fable-5' "$capture_dir/fable-wrapper.args" >/dev/null
rg -Fx -- 'high' "$capture_dir/fable-wrapper.args" >/dev/null
if rg -F '[1m]' "$capture_dir/fable-wrapper.args" >/dev/null; then
  echo "fable wrapper forced 1M context" >&2
  exit 1
fi

PATH="$fake_bin:$PATH" \
  FAKE_CAPTURE_DIR="$capture_dir" \
  FAKE_RUN_ID="opus-wrapper" \
  OPUS_API_KEY="test" \
  "$repo_root/bin/opus" < /dev/null >/dev/null 2>/dev/null
rg -Fx -- 'claude-opus-5' "$capture_dir/opus-wrapper.args" >/dev/null
rg -Fx -- 'medium' "$capture_dir/opus-wrapper.args" >/dev/null
if rg -F '[1m]' "$capture_dir/opus-wrapper.args" >/dev/null; then
  echo "opus wrapper forced 1M context" >&2
  exit 1
fi

echo "claude headless runner tests passed"
