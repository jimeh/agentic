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

file_hash() {
  git hash-object --no-filters "$1"
}

HELPER_PATH="$helper" PYTHONDONTWRITEBYTECODE=1 python3 - <<'PY'
import importlib.util
import os

spec = importlib.util.spec_from_file_location(
    "check_collisions", os.environ["HELPER_PATH"]
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.parse_name_status(b"M\0path\0R100\0old\0new\0") == [
    (b"M", [b"path"]),
    (b"R100", [b"old", b"new"]),
]
for malformed in (
    b"M\0path",
    b"Rbad\0old\0new\0",
    b"Z\0path\0",
    b"R100\0old\0\0",
):
    try:
        module.parse_name_status(malformed)
    except RuntimeError:
        pass
    else:
        raise AssertionError(f"accepted malformed name-status data: {malformed!r}")
PY

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

index_path="${repo}/.git/index"
touch "${repo}/src/base.txt"
index_hash="$(file_hash "$index_path")"
expect_clear "$repo"
[ "$(file_hash "$index_path")" = "$index_hash" ] || \
  fail "collision inspection must not refresh the index"

repo="$(new_repo case-insensitive)"
(
  cd "$repo"
  git switch -q main
  printf 'upstream\n' > Foo.txt
  git add Foo.txt
  git commit -qm 'add case-folded path'
  git switch -q feature
  git config core.ignorecase true
  printf 'foo.txt\n' >> .git/info/exclude
  printf 'local\n' > foo.txt
)
expect_collision "$repo" Foo.txt

repo="$(new_repo ignored-symlink)"
(
  cd "$repo"
  git switch -q main
  printf 'upstream\n' > collision
  git add -f collision
  git commit -qm 'materialize ignored symlink path'
  git switch -q feature
  ln -s protected collision
)
expect_collision "$repo" collision

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

repo="$(new_repo directory-rename)"
(
  cd "$repo"
  git switch -q main
  mkdir -p old new
  printf 'base\n' > old/file.txt
  printf 'anchor\n' > new/anchor.txt
  printf 'new/new.txt\n' >> .gitignore
  git add .gitignore old/file.txt new/anchor.txt
  git commit -qm 'add rename source and target'
  git branch -f feature HEAD
  git mv old/file.txt new/file.txt
  git commit -qm 'move file to new directory'
  git switch -q feature
  printf 'feature\n' > old/new.txt
  git add old/new.txt
  git commit -qm 'add file to old directory'
  printf 'protected\n' > new/new.txt
)
expect_collision "$repo" new/new.txt
unlink "${repo}/new/new.txt"
(
  cd "$repo"
  set +e
  git rebase main >/dev/null 2>&1
  rebase_status=$?
  set -e
  if [ "$rebase_status" -ne 0 ]; then
    git ls-files --error-unmatch new/new.txt >/dev/null || \
      fail "directory relocation conflict must expose the integrated path"
    git add new/new.txt
    GIT_EDITOR=true git rebase --continue >/dev/null
  fi
)
(cd "$repo" && git ls-files --error-unmatch new/new.txt >/dev/null) || \
  fail "a clear rebase must preserve inferred directory relocation"
if (cd "$repo" && git ls-files --error-unmatch old/new.txt >/dev/null 2>&1); then
  fail "a clear rebase must not reintroduce the upstream directory"
fi

repo="$(new_repo renamed-child-directory)"
(
  cd "$repo"
  git switch -q main
  mkdir -p old/a new/b
  printf 'one\n' > old/a/one.txt
  printf 'two\n' > old/a/two.txt
  printf 'anchor\n' > new/b/anchor.txt
  printf 'new/unrelated.txt\n' >> .gitignore
  git add .gitignore old/a/one.txt old/a/two.txt new/b/anchor.txt
  git commit -qm 'add renamed child sources'
  git branch -f feature HEAD
  git mv old/a/one.txt new/b/one.txt
  git mv old/a/two.txt new/b/two.txt
  git commit -qm 'move and rename child directory'
  git switch -q feature
  printf 'feature\n' > old/unrelated.txt
  git add old/unrelated.txt
  git commit -qm 'add unrelated parent child'
  printf 'protected\n' > new/unrelated.txt
)
expect_clear "$repo"
unlink "${repo}/new/unrelated.txt"
(
  cd "$repo"
  git rebase main >/dev/null
  git ls-files --error-unmatch old/unrelated.txt >/dev/null
)

repo="$(new_repo replay-directory-rename)"
(
  cd "$repo"
  git switch -q main
  printf 'upstream\n' > dir/upstream.txt
  git add dir/upstream.txt
  git commit -qm 'add file to upstream directory'
  git switch -q feature
  git mv dir moved
  git commit -qm 'move directory on feature'
  printf 'moved/upstream.txt\n' >> .git/info/exclude
  printf 'protected\n' > moved/upstream.txt
)
expect_collision "$repo" moved/upstream.txt

repo="$(new_repo root-directory-rename)"
(
  cd "$repo"
  git switch -q main
  mkdir -p old
  printf 'base\n' > old/file.txt
  printf '/new.txt\n' >> .gitignore
  git add .gitignore old/file.txt
  git commit -qm 'add root relocation source'
  git branch -f feature HEAD
  git mv old/file.txt file.txt
  git commit -qm 'move file to repository root'
  git switch -q feature
  printf 'feature\n' > old/new.txt
  git add old/new.txt
  git commit -qm 'add file below relocated directory'
  printf 'protected\n' > new.txt
)
expect_collision "$repo" new.txt

repo="$(new_repo nested-root-directory-rename)"
(
  cd "$repo"
  git switch -q main
  mkdir -p old/a a
  printf 'one\n' > old/a/one.txt
  printf 'two\n' > old/a/two.txt
  printf 'anchor\n' > a/anchor.txt
  printf '/unrelated.txt\n' >> .gitignore
  git add .gitignore old/a/one.txt old/a/two.txt a/anchor.txt
  git commit -qm 'add nested root relocation sources'
  git branch -f feature HEAD
  git mv old/a/one.txt a/one.txt
  git mv old/a/two.txt a/two.txt
  git commit -qm 'move nested directory to root'
  git switch -q feature
  printf 'feature\n' > old/unrelated.txt
  git add old/unrelated.txt
  git commit -qm 'add file below root relocation source'
  printf 'protected\n' > unrelated.txt
)
expect_collision "$repo" unrelated.txt

repo="$(new_repo aggregated-directory-rename)"
(
  cd "$repo"
  git switch -q main
  mkdir -p old/a old/b new
  printf 'a\n' > old/a/file.txt
  printf 'b\n' > old/b/file.txt
  printf 'anchor\n' > new/anchor.txt
  printf 'new/unrelated.txt\n' >> .gitignore
  git add .gitignore old/a/file.txt old/b/file.txt new/anchor.txt
  git commit -qm 'add nested rename sources'
  git branch -f feature HEAD
  mkdir -p new/a new/b
  git mv old/a/file.txt new/a/file.txt
  git mv old/b/file.txt new/b/file.txt
  git commit -qm 'move nested directory files'
  git switch -q feature
  printf 'feature\n' > old/unrelated.txt
  git add old/unrelated.txt
  git commit -qm 'add file below aggregate rename source'
  printf 'protected\n' > new/unrelated.txt
)
expect_collision "$repo" new/unrelated.txt

repo="$(new_repo repeated-directory-evidence)"
(
  cd "$repo"
  git switch -q main
  mkdir -p old/a new
  printf 'one\n' > old/a/one.txt
  printf 'two\n' > old/a/two.txt
  printf 'anchor\n' > new/anchor.txt
  printf 'new/unrelated.txt\n' >> .gitignore
  git add .gitignore old/a/one.txt old/a/two.txt new/anchor.txt
  git commit -qm 'add repeated rename evidence'
  git branch -f feature HEAD
  mkdir -p new/a
  git mv old/a/one.txt new/a/one.txt
  git mv old/a/two.txt new/a/two.txt
  git commit -qm 'move one nested directory'
  git switch -q feature
  printf 'feature\n' > old/unrelated.txt
  git add old/unrelated.txt
  git commit -qm 'add file below inferred parent rename'
  printf 'protected\n' > new/unrelated.txt
)
expect_collision "$repo" new/unrelated.txt

repo="$(new_repo nested-file-move)"
(
  cd "$repo"
  git switch -q main
  mkdir -p src/a lib/b
  printf 'nested\n' > src/a/file.txt
  printf 'anchor\n' > lib/b/anchor.txt
  printf 'lib/unrelated.txt\n' >> .gitignore
  git add .gitignore src/a/file.txt lib/b/anchor.txt
  git commit -qm 'add nested move source and target'
  git branch -f feature HEAD
  git mv src/a/file.txt lib/b/file.txt
  git commit -qm 'move one nested file'
  git switch -q feature
  printf 'feature\n' > src/unrelated.txt
  git add src/unrelated.txt
  git commit -qm 'add unrelated source sibling'
  printf 'protected\n' > lib/unrelated.txt
)
expect_clear "$repo"
unlink "${repo}/lib/unrelated.txt"
(
  cd "$repo"
  git rebase main >/dev/null
  git ls-files --error-unmatch src/unrelated.txt >/dev/null
)

repo="$(new_repo continuation-collision)"
(
  cd "$repo"
  git switch -q main
  mkdir -p old new
  printf 'base\n' > old/file.txt
  printf 'anchor\n' > new/anchor.txt
  printf 'base\n' > conflict.txt
  printf 'new/new.txt\n' >> .gitignore
  git add .gitignore old/file.txt new/anchor.txt conflict.txt
  git commit -qm 'add rename and conflict fixtures'
  git branch -f feature HEAD
  git mv old/file.txt new/file.txt
  printf 'main\n' > conflict.txt
  git add conflict.txt
  git commit -qm 'move directory and edit conflict on main'
  git switch -q feature
  printf 'feature\n' > conflict.txt
  git add conflict.txt
  git commit -qm 'edit conflict on feature'
  printf 'feature\n' > old/new.txt
  git add old/new.txt
  git commit -qm 'add file to old directory'
)
expect_clear "$repo"
(
  cd "$repo"
  set +e
  git rebase main >/dev/null 2>&1
  rebase_status=$?
  set -e
  [ "$rebase_status" -ne 0 ] || \
    fail "continuation fixture must stop at its first conflict"
  printf 'resolved\n' > conflict.txt
  git add conflict.txt
  printf 'protected\n' > new/new.txt
)
expect_collision "$repo" new/new.txt
(cd "$repo" && git rebase --abort)

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
