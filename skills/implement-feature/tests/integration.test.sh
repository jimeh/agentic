#!/usr/bin/env bash
# Exercises the Git commands in references/integration.md and the per-path
# baseline in SKILL.md against throwaway repositories, so a change in Git
# behavior or in those recipes shows up here.
set -euo pipefail

export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null
export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com

test_tmp="$(mktemp -d "${TMPDIR:-/tmp}/implement-feature-test.XXXXXX")"
trap 'rm -rf "$test_tmp"' EXIT

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

# The per-path baseline recipe from SKILL.md.
snapshot() {
  {
    git diff --name-only -z HEAD
    git ls-files -z -o --exclude-standard
  } |
    while IFS= read -r -d '' f; do
      printf '%s\t%s\n' \
        "$(git hash-object -- "$f" 2> /dev/null || echo missing)" "$f"
    done | sort
  printf 'index\t%s\n' "$(git diff --cached --binary | git hash-object --stdin)"
}

new_repo() {
  local dir="$1"
  git init -q "$dir"
  printf 'a\nb\nc\n' > "$dir/feature.txt"
  printf 'x\n' > "$dir/user.txt"
  git -C "$dir" add -A
  git -C "$dir" commit -qm base
}

# --- Per-path baseline attributes an edit to an already-dirty file.
repo="$test_tmp/baseline"
new_repo "$repo"
cd "$repo"
printf 'x-user\n' > user.txt
printf 'scratch\n' > untracked.txt
before="$(snapshot)"
printf 'x-user-worker\n' > user.txt
printf 'feat\n' > feature-new.txt
after="$(snapshot)"
changed="$({ diff <(printf '%s\n' "$before") <(printf '%s\n' "$after") || true; } |
  sed -n 's/^> [^\t]*\t//p' | sort | tr '\n' ' ')"
assert_equal "feature-new.txt user.txt " "$changed" \
  "baseline names the worker's edit to a dirty file and its new file"

# --- Temporary-index capture leaves the real index untouched.
git add user.txt
index_before="$(git diff --cached --binary | git hash-object --stdin)"
TMP_INDEX="$(mktemp)"
cp "$(git rev-parse --git-path index)" "$TMP_INDEX"
GIT_INDEX_FILE="$TMP_INDEX" git add -A -- feature-new.txt
GIT_INDEX_FILE="$TMP_INDEX" git diff --binary --cached HEAD -- feature-new.txt \
  > "$test_tmp/capture.patch"
rm -f "$TMP_INDEX"
grep -q '^+feat$' "$test_tmp/capture.patch" ||
  fail "temporary-index capture misses the new file"
grep -q 'user.txt' "$test_tmp/capture.patch" &&
  fail "temporary-index capture includes an unrelated path"
assert_equal "$index_before" \
  "$(git diff --cached --binary | git hash-object --stdin)" \
  "temporary-index capture changed the real index"

# --- Isolated rounds without commit authority on the destination.
dest="$test_tmp/dest"
new_repo "$dest"
cd "$dest"
START_TIP="$(git rev-parse HEAD)"
printf 'x-user\n' > user.txt
WORKTREE_DIR="$test_tmp/worktree"
BRANCH="impl/test"
git worktree add -q -b "$BRANCH" "$WORKTREE_DIR" "$START_TIP"

printf 'a\nB1\nc\n' > "$WORKTREE_DIR/feature.txt"
printf 'new\n' > "$WORKTREE_DIR/added.txt"
(cd "$WORKTREE_DIR" && git add -A && git commit -qm round1)
PREV_ROUND_TIP="$(git -C "$WORKTREE_DIR" rev-parse HEAD)"

git merge-base --is-ancestor "$START_TIP" "$BRANCH" ||
  fail "start tip is not an ancestor of the throwaway branch"
git merge-base --is-ancestor HEAD "$BRANCH" ||
  fail "destination head is not an ancestor of the throwaway branch"
git diff --cached --quiet || fail "destination index was not clean"
git merge --squash "$BRANCH" > /dev/null
assert_equal "x-user" "$(cat user.txt)" "squash touched unstaged user work"

printf 'a\nB2\nc\n' > "$WORKTREE_DIR/feature.txt"
(cd "$WORKTREE_DIR" && git add -A && git commit -qm round2)
ROUND_TIP="$(git -C "$WORKTREE_DIR" rev-parse HEAD)"

if git merge --squash "$BRANCH" > /dev/null 2>&1; then
  fail "a second squash over a staged round unexpectedly succeeded"
fi
git -C "$WORKTREE_DIR" diff --binary "$PREV_ROUND_TIP" "$ROUND_TIP" \
  > "$test_tmp/round.patch"
git apply --index "$test_tmp/round.patch"
assert_equal "$(printf 'a\nB2\nc')" "$(git show :feature.txt)" \
  "staged result lacks the second round"
assert_equal "new" "$(git show :added.txt)" \
  "staged result lost the first round's new file"
assert_equal "x-user" "$(cat user.txt)" "delta apply touched unstaged user work"
git diff --cached --quiet -- user.txt ||
  fail "unrelated user work was staged"

# --- Once a round is committed, realign and squash the next round.
git commit -qm "integrate rounds 1-2"
(cd "$WORKTREE_DIR" && git reset -q --hard "$(git -C "$dest" rev-parse HEAD)")
printf 'a\nB3\nc\n' > "$WORKTREE_DIR/feature.txt"
(cd "$WORKTREE_DIR" && git add -A && git commit -qm round3)
git diff --cached --quiet || fail "destination index was not clean"
git merge --squash "$BRANCH" > /dev/null
assert_equal "$(printf 'a\nB3\nc')" "$(git show :feature.txt)" \
  "realigned round did not squash cleanly"

# --- A fast-forward squash does not protect existing staged work.
ff="$test_tmp/ff"
new_repo "$ff"
cd "$ff"
git worktree add -q -b impl/ff "$test_tmp/ff-worktree" HEAD
printf 'a\nF\nc\n' > "$test_tmp/ff-worktree/feature.txt"
(cd "$test_tmp/ff-worktree" && git add -A && git commit -qm ff)
printf 'x-staged\n' > user.txt
git add user.txt
if git diff --cached --quiet; then
  fail "clean-index check missed staged user work"
fi
git merge --squash impl/ff > /dev/null 2>&1 ||
  fail "expected the fast-forward squash to succeed over staged work"
git diff --cached --quiet -- user.txt &&
  fail "expected staged user work to be mixed into the squash"

# --- A separate clone applies the captured patch.
clone="$test_tmp/clone"
git clone -q "$dest" "$clone"
git -C "$clone" reset -q --hard "$START_TIP"
git -C "$WORKTREE_DIR" diff --binary "$START_TIP" "$PREV_ROUND_TIP" \
  > "$test_tmp/change.patch"
git -C "$clone" apply --index "$test_tmp/change.patch"
assert_equal "new" "$(git -C "$clone" show :added.txt)" \
  "separate-clone patch lost a new file"

printf 'PASS: implement-feature integration recipes\n'
