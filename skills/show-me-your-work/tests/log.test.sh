#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
helper="${script_dir}/../scripts/log.sh"
test_tmp="$(mktemp -d "${TMPDIR:-/tmp}/show-me-your-work-test.XXXXXX")"
trap 'find "$test_tmp" -depth -delete' EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_equal() {
  local expected="$1" actual="$2" message="$3"
  if [ "$actual" != "$expected" ]; then
    printf 'FAIL: %s\n  expected: %s\n  actual:   %s\n' \
      "$message" "$expected" "$actual" >&2
    exit 1
  fi
}

file_mode() {
  python3 -c \
    'import os, sys; print(oct(os.stat(sys.argv[1]).st_mode & 0o777)[2:])' \
    "$1"
}

file_hash() {
  git hash-object --no-filters "$1"
}

trail="${test_tmp}/private/trail.tsv"
(
  umask 002
  "$helper" "$trail" $'phase\tone' '=decision' rationale \
    $'file:1\ncommand:ok' open
)

assert_equal "600" "$(file_mode "$trail")" \
  "new trails must be private"
assert_equal "2" "$(wc -l < "$trail")" \
  "the helper must write one header and one row"
if ! awk -F '\t' 'NF != 6 || $1 == "" { exit 1 }' "$trail"; then
  fail "every trail record must have six populated timestamp fields"
fi

IFS=$'\t' read -r timestamp phase decision rationale evidence outcome \
  < <(tail -n 1 "$trail")
[ -n "$timestamp" ] || fail "timestamp must be populated"
assert_equal "phase one" "$phase" "tabs must become spaces"
assert_equal "'=decision" "$decision" \
  "spreadsheet formula prefixes must be neutralized"
assert_equal "rationale" "$rationale" "ordinary cells must be unchanged"
assert_equal "file:1 command:ok" "$evidence" \
  "newlines must become spaces"
assert_equal "open" "$outcome" "outcome must be retained"

first_row="$(tail -n 1 "$trail")"
"$helper" "$trail" second follow-up because commit:abc123 complete
assert_equal "3" "$(wc -l < "$trail")" \
  "a valid existing trail must accept another row"
assert_equal "$first_row" "$(sed -n '2p' "$trail")" \
  "appending must preserve earlier rows"
assert_equal "follow-up" "$(awk -F '\t' 'NR == 3 { print $3 }' "$trail")" \
  "the appended row must retain its decision"

wrong_header="${test_tmp}/wrong-header.tsv"
printf 'not\tthe\texpected\theader\n' > "$wrong_header"
wrong_header_hash="$(file_hash "$wrong_header")"
if "$helper" "$wrong_header" p d r e o 2>/dev/null; then
  fail "unexpected headers must be rejected"
fi
assert_equal "$wrong_header_hash" \
  "$(file_hash "$wrong_header")" \
  "rejected wrong-header trails must remain unchanged"

malformed="${test_tmp}/malformed.tsv"
printf 'ts\tphase\tdecision\trationale\tevidence\toutcome\n' > "$malformed"
printf 'too\tfew\n' >> "$malformed"
malformed_hash="$(file_hash "$malformed")"
if "$helper" "$malformed" p d r e o 2>/dev/null; then
  fail "malformed existing rows must be rejected"
fi
assert_equal "$malformed_hash" \
  "$(file_hash "$malformed")" \
  "rejected malformed trails must remain unchanged"

unterminated="${test_tmp}/unterminated.tsv"
printf 'ts\tphase\tdecision\trationale\tevidence\toutcome\n' > "$unterminated"
printf 'ts\tp\td\tr\te\to\0' >> "$unterminated"
unterminated_hash="$(file_hash "$unterminated")"
if "$helper" "$unterminated" p d r e o 2>/dev/null; then
  fail "a non-newline final byte must be rejected"
fi
assert_equal "$unterminated_hash" \
  "$(file_hash "$unterminated")" \
  "rejected unterminated trails must remain unchanged"

(
  cd "$test_tmp"
  "$helper" '-option/trail.tsv' p d r e o
)
assert_equal "600" "$(file_mode "${test_tmp}/-option/trail.tsv")" \
  "leading-dash parent paths must remain literal"

if "$helper" "${test_tmp}/arity.tsv" p d r e 2>/dev/null; then
  fail "wrong argument counts must be rejected"
fi

printf 'PASS: show-me-your-work log helper\n'
