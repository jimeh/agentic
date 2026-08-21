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

file_mtime() {
  python3 -c 'import os, sys; print(os.lstat(sys.argv[1]).st_mtime_ns)' "$1"
}

git_storage_snapshot() {
  local git_dir file
  git_dir="$(git rev-parse --git-dir)"
  {
    find "$git_dir" -maxdepth 1 -type f \
      \( -name index -o -name 'sharedindex.*' \) -print
    find "$git_dir/objects" -type f -print
  } | LC_ALL=C sort | while IFS= read -r file; do
    printf '%s %s %s\n' \
      "${file#"$git_dir"/}" "$(file_hash "$file")" "$(file_mtime "$file")"
  done
}

add_current_gitlink() {
  local repo="$1" child="$2"
  (
    cd "$repo"
    git -c protocol.file.allow=always submodule add -q "$child" module
    git commit -qm 'add current gitlink'
    git branch -f candidate HEAD
  )
}

protect_current_gitlink() {
  local repo="$1"
  (
    cd "$repo"
    git switch -q current
    git -c protocol.file.allow=always submodule update -q --init module
    module_exclude="$(cd module && git rev-parse --git-path info/exclude)"
    printf 'local.txt\n' >> "$module_exclude"
    printf 'protected\n' > module/local.txt
  )
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

repo="$(new_repo split-index-nonmutation)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  git config core.splitIndex true
)
storage_before="$(cd "$repo" && git_storage_snapshot)"
expect_clear "$repo"
storage_after="$(cd "$repo" && git_storage_snapshot)"
[ "$storage_after" = "$storage_before" ] || \
  fail "collision inspection must not mutate index or object storage"

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

repo="$(new_repo exact-nested-file)"
(
  cd "$repo"
  git switch -q candidate
  mkdir -p ignored-dir
  printf 'candidate\n' > ignored-dir/local.txt
  git add -f ignored-dir/local.txt
  git commit -qm 'add ignored nested file'
  git switch -q current
  mkdir -p ignored-dir
  printf 'protected\n' > ignored-dir/local.txt
)
expect_collision "$repo" ignored-dir/local.txt

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

repo="$(new_repo symlink-blocks-directory)"
(
  cd "$repo"
  git switch -q candidate
  mkdir -p blocked
  printf 'candidate\n' > blocked/child.txt
  git add -f blocked/child.txt
  git commit -qm 'add child below ignored symlink'
  git switch -q current
  ln -s protected blocked
)
expect_collision "$repo" blocked

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

repo="$(new_repo case-config-mismatch)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > README
  git add README
  git commit -qm 'add case-folded path with stale config'
  git switch -q current
  git config core.ignorecase false
  printf 'readme\n' >> .git/info/exclude
  printf 'protected\n' > readme
)
if python3 -c \
  'import os, sys; sys.exit(not os.path.samestat(os.lstat(sys.argv[1]), os.lstat(sys.argv[2])))' \
  "${repo}/README" "${repo}/readme" 2>/dev/null; then
  expect_collision "$repo" readme
else
  expect_clear "$repo"
fi

repo="$(new_repo unicode-normalization)"
nfc_path=$'caf\xc3\xa9.cfg'
nfd_path=$'cafe\xcc\x81.cfg'
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > "$nfc_path"
  git add -f "$nfc_path"
  git commit -qm 'add normalized path'
  git switch -q current
  printf '%s\n' "$nfd_path" >> .git/info/exclude
  printf 'protected\n' > "$nfd_path"
)
if python3 -c \
  'import os, sys; sys.exit(not os.path.samestat(os.lstat(sys.argv[1]), os.lstat(sys.argv[2])))' \
  "${repo}/${nfc_path}" "${repo}/${nfd_path}" 2>/dev/null; then
  expect_collision "$repo" "$nfd_path"
else
  expect_clear "$repo"
fi

repo="$(new_repo combined-case-normalization)"
combined_candidate=$'CAF\xc3\x89.cfg'
combined_local=$'cafe\xcc\x81.cfg'
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > "$combined_candidate"
  git add -f "$combined_candidate"
  git commit -qm 'add case and normalization alias'
  git switch -q current
  printf '%s\n' "$combined_local" >> .git/info/exclude
  printf 'protected\n' > "$combined_local"
)
if python3 -c \
  'import os, sys; sys.exit(not os.path.samestat(os.lstat(sys.argv[1]), os.lstat(sys.argv[2])))' \
  "${repo}/${combined_candidate}" "${repo}/${combined_local}" 2>/dev/null; then
  expect_collision "$repo" "$combined_local"
else
  expect_clear "$repo"
fi

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

repo="$(new_repo hidden-filemode-change)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  git config core.filemode false
  chmod +x src/base.txt
  [ -z "$(git status --porcelain=v2 --untracked-files=all)" ] || \
    fail "core.filemode=false must hide the executable-bit change in this probe"
)
expect_inconclusive "$repo" "tracked worktree no longer matches current head"

repo="$(new_repo hidden-content-change)"
(
  cd "$repo"
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  git config core.trustctime false
  git config core.checkStat minimal
  touch -t 200001010000 src/base.txt
  git update-index --refresh
  touch -r src/base.txt .git/base-time
  sleep 1
  printf 'evil\n' > src/base.txt
  touch -r .git/base-time src/base.txt
  [ -z "$(git status --porcelain=v2 --untracked-files=all)" ] || \
    fail "core.trustctime=false must hide the same-size content change in this probe"
)
expect_inconclusive "$repo" "tracked worktree no longer matches current head"

repo="$(new_repo committed-crlf)"
(
  cd "$repo"
  git config core.autocrlf false
  printf 'one\r\ntwo\r\n' > committed-crlf.txt
  git add committed-crlf.txt
  git commit -qm 'add committed CRLF blob'
  git branch -f candidate HEAD
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  git config core.autocrlf true
  expected_oid="$(git rev-parse current:committed-crlf.txt)"
  filtered_oid="$(git hash-object committed-crlf.txt)"
  [ "$filtered_oid" != "$expected_oid" ] || \
    fail "the CRLF probe must exercise Git's filtered-hash mismatch"
  [ -z "$(git status --porcelain=v2 --untracked-files=all)" ] || \
    fail "Git must consider the committed CRLF worktree clean in this probe"
)
expect_clear "$repo"

repo="$(new_repo assume-unchanged-entry)"
(
  cd "$repo"
  printf 'assumed\n' > assumed.txt
  git add assumed.txt
  git commit -qm 'add assume-unchanged path'
  git branch -f candidate HEAD
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  git update-index --assume-unchanged assumed.txt
)
expect_inconclusive "$repo" "assume-unchanged"

repo="$(new_repo skip-worktree-entry)"
(
  cd "$repo"
  printf 'sparse\n' > sparse.txt
  git add sparse.txt
  git commit -qm 'add skip-worktree path'
  git branch -f candidate HEAD
  git switch -q candidate
  printf 'candidate\n' > src/candidate.txt
  git add src/candidate.txt
  git commit -qm candidate
  git switch -q current
  git update-index --skip-worktree sparse.txt
)
expect_inconclusive "$repo" "skip-worktree"

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

repo="$(new_repo current-gitlink-to-file)"
add_current_gitlink "$repo" "$child"
(
  cd "$repo"
  git switch -q candidate
  git rm -qf module .gitmodules
  find module -depth -delete 2>/dev/null || true
  printf 'candidate\n' > module
  git add module
  git commit -qm 'replace gitlink with file'
)
protect_current_gitlink "$repo"
expect_collision "$repo" module
(
  cd "$repo"
  git submodule deinit -q -f module
  mkdir -p module
)
expect_clear "$repo"
(
  cd "$repo"
  git reset -q --hard candidate
)
[ -z "$(cd "$repo" && git status --porcelain=v2 --untracked-files=all)" ] || \
  fail "an uninitialized gitlink replacement must keep status clean"

repo="$(new_repo changed-gitlink)"
add_current_gitlink "$repo" "$child"
(
  cd "$child"
  printf 'updated\n' > child.txt
  git add child.txt
  git commit -qm 'update child'
)
updated_child_head="$(cd "$child" && git rev-parse HEAD)"
(
  cd "$repo"
  git switch -q candidate
  (
    cd module
    git fetch -q
    git checkout -q "$updated_child_head"
  )
  git add module
  git commit -qm 'advance gitlink'
)
protect_current_gitlink "$repo"
expect_collision "$repo" module
(
  cd "$repo"
  git submodule deinit -q -f module
  mkdir -p module
)
expect_clear "$repo"
(
  cd "$repo"
  git reset -q --hard candidate
)
[ -z "$(cd "$repo" && git status --porcelain=v2 --untracked-files=all)" ] || \
  fail "an uninitialized gitlink OID change must keep status clean"

repo="$(new_repo same-gitlink)"
add_current_gitlink "$repo" "$child"
protect_current_gitlink "$repo"
same_gitlink_hash="$(file_hash "${repo}/module/local.txt")"
expect_clear "$repo"
(
  cd "$repo"
  git reset -q --hard candidate
)
[ "$(file_hash "${repo}/module/local.txt")" = "$same_gitlink_hash" ] || \
  fail "an unchanged gitlink must preserve ignored submodule contents"
[ -z "$(cd "$repo" && git status --porcelain=v2 --untracked-files=all)" ] || \
  fail "an unchanged materialized gitlink must keep status clean"

repo="$(new_repo removed-gitlink)"
add_current_gitlink "$repo" "$child"
(
  cd "$repo"
  git switch -q candidate
  git rm -qf module .gitmodules
  find module -depth -delete 2>/dev/null || true
  git commit -qm 'remove gitlink'
)
protect_current_gitlink "$repo"
expect_collision "$repo" module

repo="$(new_repo gitlink-to-tree)"
add_current_gitlink "$repo" "$child"
(
  cd "$repo"
  git switch -q candidate
  git rm -qf module .gitmodules
  find module -depth -delete 2>/dev/null || true
  mkdir module
  printf 'candidate\n' > module/child.txt
  git add module/child.txt
  git commit -qm 'replace gitlink with tree'
)
protect_current_gitlink "$repo"
expect_collision "$repo" module

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
