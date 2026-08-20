#!/usr/bin/env bash
set -euo pipefail

export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null

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
  git init -q -b current "$repo"
  (
    cd "$repo"
    git config user.name tester
    git config user.email tester@example.com
    printf 'blocked\ncollision\nignored-dir/\n' > .gitignore
    mkdir -p dir src
    printf 'tracked\n' > dir/tracked.txt
    printf 'base\n' > src/base.txt
    git add .gitignore dir/tracked.txt src/base.txt
    git commit -qm base
    git branch candidate
  )
  printf '%s\n' "$repo"
}

expect_clear() {
  local repo="$1"
  if ! (cd "$repo" && "$helper" current candidate current); then
    fail "expected no collision in ${repo##*/}"
  fi
}

expect_collision() {
  local repo="$1" expected="$2" output status
  set +e
  output="$(cd "$repo" && "$helper" current candidate current 2>&1)"
  status=$?
  set -e
  [ "$status" -eq 2 ] || fail "expected collision exit 2 in ${repo##*/}"
  [[ "$output" == *"$expected"* ]] || \
    fail "expected collision output to name ${expected}"
}

expect_inconclusive() {
  local repo="$1" expected="$2" output status
  set +e
  output="$(cd "$repo" && "$helper" current candidate current 2>&1)"
  status=$?
  set -e
  [ "$status" -eq 1 ] || fail "expected inconclusive exit 1 in ${repo##*/}"
  [[ "$output" == *"$expected"* ]] || \
    fail "expected inconclusive output to mention ${expected}"
}

file_hash() {
  git hash-object --no-filters "$1"
}

repo="$(new_repo unrelated)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  mkdir -p cache
  printf 'cache/\n' >> .git/info/exclude
  printf 'local\n' > cache/data
)
expect_clear "$repo"

index_path="${repo}/.git/index"
touch "${repo}/src/base.txt"
index_hash="$(file_hash "$index_path")"
expect_clear "$repo"
[ "$(file_hash "$index_path")" = "$index_hash" ] || \
  fail "collision inspection must not refresh the index"

(
  cd "${repo}/src"
  "$helper" current candidate current
) || fail "the helper must work below the repository root"

repo="$(new_repo exact-file)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > collision
  git add -f collision
  git commit -qm 'materialize ignored file'
  git switch -q current
  printf 'protected\n' > collision
)
expect_collision "$repo" collision

repo="$(new_repo compatible-directory)"
(
  cd "$repo"
  git switch -q candidate
  mkdir -p ignored-dir
  printf 'candidate\n' > ignored-dir/candidate.txt
  git add -f ignored-dir/candidate.txt
  git commit -qm 'add ignored directory child'
  git switch -q current
  mkdir -p ignored-dir
  printf 'local\n' > ignored-dir/local.txt
)
expect_clear "$repo"

repo="$(new_repo populate-empty-directory)"
(
  cd "$repo"
  git switch -q candidate
  mkdir -p empty
  printf 'candidate\n' > empty/child.txt
  git add empty/child.txt
  git commit -qm 'populate empty directory'
  git switch -q current
  mkdir empty
)
expect_collision "$repo" empty

repo="$(new_repo file-blocks-directory)"
(
  cd "$repo"
  git switch -q candidate
  mkdir -p blocked
  printf 'candidate\n' > blocked/child.txt
  git add -f blocked/child.txt
  git commit -qm 'replace ignored file with directory'
  git switch -q current
  printf 'protected\n' > blocked
)
expect_collision "$repo" blocked

repo="$(new_repo directory-replaced-by-file)"
(
  cd "$repo"
  git switch -q candidate
  git rm -qr dir
  printf 'candidate\n' > dir
  git add dir
  git commit -qm 'replace tracked directory with file'
  git switch -q current
  printf 'dir/local.txt\n' >> .git/info/exclude
  printf 'protected\n' > dir/local.txt
)
expect_collision "$repo" dir/local.txt

repo="$(new_repo empty-directory)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > collision
  git add -f collision
  git commit -qm 'replace empty directory with file'
  git switch -q current
  mkdir collision
)
expect_collision "$repo" collision

repo="$(new_repo ignored-symlink)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > collision
  git add -f collision
  git commit -qm 'replace ignored symlink'
  git switch -q current
  ln -s protected collision
)
expect_collision "$repo" collision

repo="$(new_repo case-insensitive)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > Foo.txt
  git add Foo.txt
  git commit -qm 'add case-folded path'
  git switch -q current
  git config core.ignorecase true
  printf 'foo.txt\n' >> .git/info/exclude
  printf 'protected\n' > foo.txt
)
expect_collision "$repo" foo.txt

repo="$(new_repo case-alias)"
(
  cd "$repo"
  printf 'tracked\n' > Foo
  git add Foo
  git commit -qm 'add mixed-case tracked path'
  git branch -f candidate HEAD
  git switch -q candidate
  git mv Foo foo
  git commit -qm 'rename tracked path by case'
  git switch -q current
  git config core.ignorecase true
  printf 'protected\n' > foo
)
if python3 -c \
  'import os, sys; sys.exit(not os.path.samestat(os.lstat(sys.argv[1]), os.lstat(sys.argv[2])))' \
  "${repo}/Foo" "${repo}/foo"; then
  (cd "$repo" && git reset -q --hard current)
  expect_clear "$repo"
else
  expect_collision "$repo" foo
fi

repo="$(new_repo dirty-tracked)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  printf 'modified\n' > src/base.txt
)
expect_inconclusive "$repo" "no longer clean"

repo="$(new_repo preserve-flags)"
(
  cd "$repo"
  printf 'assumed\n' > assumed.txt
  printf 'sparse\n' > sparse.txt
  git add assumed.txt sparse.txt
  git commit -qm 'add flagged paths'
  git branch -f candidate HEAD
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  printf 'candidate sparse\n' > sparse.txt
  git add src/candidate.txt sparse.txt
  git commit -qm candidate
  git switch -q current
  git update-index --assume-unchanged assumed.txt
  git update-index --skip-worktree sparse.txt
  rm sparse.txt
  "$helper" current candidate current
  git reset -q --hard candidate
  git update-index --assume-unchanged assumed.txt
  git update-index --skip-worktree sparse.txt
  rm sparse.txt
  flags="$(git ls-files -v assumed.txt sparse.txt)"
  [[ "$flags" == *$'h assumed.txt'* ]] || \
    fail "guarded apply must restore assume-unchanged"
  [[ "$flags" == *$'S sparse.txt'* ]] || \
    fail "guarded apply must preserve skip-worktree"
  [ ! -e sparse.txt ] || \
    fail "guarded apply must restore expected sparse absence"
  sparse_index="$(git ls-files -s sparse.txt | awk '{ print $2 }')"
  [ "$sparse_index" = "$(git rev-parse candidate:sparse.txt)" ] || \
    fail "sparse index entry must match the candidate"
)

repo="$(new_repo detached)"
(
  cd "$repo"
  git switch -q --detach current
)
set +e
detached_output="$(cd "$repo" && "$helper" current candidate current 2>&1)"
detached_status=$?
set -e
[ "$detached_status" -eq 1 ] || fail "detached checkout must be inconclusive"
[[ "$detached_output" == *"original checkout is detached"* ]] || \
  fail "detached checkout must produce a clear diagnostic"

repo="$(new_repo gitlink-directory)"
child="${test_tmp}/gitlink-child"
git init -q -b main "$child"
(
  cd "$child"
  git config user.name tester
  git config user.email tester@example.com
  printf 'child\n' > child.txt
  git add child.txt
  git commit -qm child
)
(
  cd "$repo"
  mkdir module
  printf 'tracked\n' > module/tracked.txt
  git add module/tracked.txt
  git commit -qm 'add tracked directory'
  git branch -f candidate HEAD
  git switch -q candidate
  git rm -qr module
  git -c protocol.file.allow=always submodule add -q "$child" module
  git commit -qm 'replace tracked directory with gitlink'
  git submodule deinit -q -f module
  git switch -q current
  printf 'module/local.txt\n' >> .git/info/exclude
  printf 'protected\n' > module/local.txt
)
gitlink_local_hash="$(file_hash "${repo}/module/local.txt")"
expect_clear "$repo"
(
  cd "$repo"
  git reset -q --hard candidate
)
[ "$(file_hash "${repo}/module/local.txt")" = "$gitlink_local_hash" ] || \
  fail "a candidate gitlink must preserve compatible local directory contents"
[ -z "$(cd "$repo" && git status --porcelain=v2 --untracked-files=all)" ] || \
  fail "a compatible local gitlink directory must keep status clean"

repo="$(new_repo head-drift)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
)
set +e
drift_output="$(cd "$repo" && "$helper" candidate current current 2>&1)"
drift_status=$?
set -e
[ "$drift_status" -eq 1 ] || fail "HEAD drift must be inconclusive"
[[ "$drift_output" == inconclusive:* ]] || \
  fail "HEAD drift must produce an inconclusive diagnostic"

repo="$(new_repo branch-drift)"
(
  cd "$repo"
  git branch sibling
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q sibling
)
set +e
branch_output="$(cd "$repo" && "$helper" current candidate current 2>&1)"
branch_status=$?
set -e
[ "$branch_status" -eq 1 ] || fail "branch drift must be inconclusive"
[[ "$branch_output" == inconclusive:* ]] || \
  fail "branch drift must produce an inconclusive diagnostic"

repo="$(new_repo isolated-rebase)"
(
  cd "$repo"
  mkdir -p old new
  printf 'base\n' > old/file.txt
  printf 'anchor\n' > new/anchor.txt
  printf 'new/new.txt\n' >> .gitignore
  git add .gitignore old/file.txt new/anchor.txt
  git commit -qm 'add rename source and target'
  git branch -f candidate HEAD
  git mv old/file.txt new/file.txt
  git commit -qm 'move file to new directory'
  git branch -m upstream
  git switch -q candidate
  printf 'feature\n' > old/new.txt
  git add old/new.txt
  git commit -qm 'add file to old directory'
  printf 'protected\n' > new/new.txt
)
protected_hash="$(file_hash "${repo}/new/new.txt")"
isolated="${test_tmp}/isolated-worktree"
(
  cd "$repo"
  git worktree add -q --detach "$isolated" candidate
)
set +e
(cd "$isolated" && git rebase upstream >/dev/null 2>&1)
rebase_status=$?
set -e
[ "$rebase_status" -ne 0 ] || fail "isolation fixture must conflict"
[ "$(file_hash "${repo}/new/new.txt")" = "$protected_hash" ] || \
  fail "an isolated rebase must not touch the original checkout"
(cd "$isolated" && git rebase --abort)
(cd "$repo" && git worktree remove --force "$isolated")

printf 'PASS: rebase collision helper\n'
