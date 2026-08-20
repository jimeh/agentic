#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
helper="${script_dir}/../scripts/check-collisions.py"
test_tmp="$(mktemp -d "${TMPDIR:-/tmp}/rebase-collision-test.XXXXXX")"
trap 'find "$test_tmp" -depth -delete' EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

new_repo() {
  local name="$1"
  local repo="${test_tmp}/${name}"
  mkdir -p "$repo"
  git init -q -b main "$repo"
  (
    cd "$repo"
    git config user.name tester
    git config user.email tester@example.com
    printf 'cache/\ncollision\nignored-dir/\nempty-dir/\ntransient\n' \
      > .gitignore
    mkdir -p dir src
    printf 'tracked\n' > dir/tracked.txt
    printf 'base\n' > src/base.txt
    git add .gitignore dir/tracked.txt src/base.txt
    git commit -qm base
    git branch feature
  )
  printf '%s\n' "$repo"
}

expect_clear() {
  local repo="$1"
  if ! (cd "$repo" && "$helper" feature main); then
    fail "expected no collision in ${repo##*/}"
  fi
}

expect_collision() {
  local repo="$1" expected="$2" output status
  set +e
  output="$(cd "$repo" && "$helper" feature main 2>&1)"
  status=$?
  set -e
  [ "$status" -eq 2 ] || fail "expected collision exit 2 in ${repo##*/}"
  [[ "$output" == *"$expected"* ]] || \
    fail "expected collision output to name ${expected}"
}

expect_inconclusive() {
  local repo="$1" output status
  set +e
  output="$(cd "$repo" && "$helper" feature main 2>&1)"
  status=$?
  set -e
  [ "$status" -eq 1 ] || fail "expected inconclusive exit 1 in ${repo##*/}"
  [[ "$output" == inconclusive:* ]] || \
    fail "expected an inconclusive diagnostic in ${repo##*/}"
}

repo="$(new_repo unrelated)"
(
  cd "$repo"
  git switch -q main
  printf 'upstream\n' > src/upstream.txt
  git add src/upstream.txt
  git commit -qm upstream
  git switch -q feature
  mkdir -p cache
  printf 'local\n' > cache/data
)
expect_clear "$repo"

repo="$(new_repo exact-file)"
(
  cd "$repo"
  git switch -q main
  printf 'upstream\n' > collision
  git add -f collision
  git commit -qm 'materialize ignored file'
  git switch -q feature
  printf 'local\n' > collision
)
expect_collision "$repo" collision

repo="$(new_repo ignored-descendant)"
(
  cd "$repo"
  git switch -q main
  mkdir -p ignored-dir
  printf 'upstream\n' > ignored-dir/new.txt
  git add -f ignored-dir/new.txt
  git commit -qm 'materialize ignored descendant'
  git switch -q feature
  mkdir -p ignored-dir
  printf 'local\n' > ignored-dir/local.txt
)
expect_collision "$repo" ignored-dir

repo="$(new_repo empty-directory)"
(
  cd "$repo"
  git switch -q main
  mkdir -p empty-dir
  printf 'upstream\n' > empty-dir/new.txt
  git add -f empty-dir/new.txt
  git commit -qm 'populate empty directory'
  git switch -q feature
  mkdir -p empty-dir
)
expect_collision "$repo" empty-dir

repo="$(new_repo transient-replay)"
(
  cd "$repo"
  git switch -q feature
  printf 'temporary\n' > transient
  git add -f transient
  git commit -qm 'add transient path'
  git rm -q transient
  git commit -qm 'remove transient path'
  printf 'local\n' > transient
)
expect_collision "$repo" transient

repo="$(new_repo replaced-directory)"
(
  cd "$repo"
  git switch -q main
  git rm -q dir/tracked.txt
  printf 'replacement\n' > dir
  git add dir
  git commit -qm 'replace directory with file'
  git switch -q feature
  mkdir -p dir/local-empty
)
expect_collision "$repo" local-empty

repo="$(new_repo unreadable-directory)"
(
  cd "$repo"
  git switch -q main
  git rm -q dir/tracked.txt
  printf 'replacement\n' > dir
  git add dir
  git commit -qm 'replace directory with file'
  git switch -q feature
  mkdir -p dir/unreadable
  chmod 000 dir/unreadable
)
expect_inconclusive "$repo"
chmod 700 "${repo}/dir/unreadable"

printf 'PASS: rebase collision helper\n'
