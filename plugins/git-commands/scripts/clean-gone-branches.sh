#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: clean-gone-branches.sh [--dry-run] [--no-fetch]

Remove local Git branches whose upstream tracking branch is gone. If a gone
branch is checked out in a linked worktree, remove that worktree first.

Options:
  --dry-run   Show what would be removed without changing anything.
  --no-fetch  Skip "git fetch --prune" before detecting gone branches.
  -h, --help  Show this help.
USAGE
}

dry_run=false
fetch_prune=true

while (($#)); do
  case "$1" in
    --dry-run)
      dry_run=true
      ;;
    --no-fetch)
      fetch_prune=false
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

repo_root=$(git rev-parse --show-toplevel)
current_branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)

if $fetch_prune; then
  git fetch --prune
fi

worktree_for_branch() {
  local branch=$1

  git worktree list --porcelain |
    awk -v ref="refs/heads/$branch" '
      $1 == "worktree" { path = substr($0, 10) }
      $1 == "branch" && $2 == ref { print path }
    '
}

gone_branches=$(
  git for-each-ref \
    --format='%(refname:short)%09%(upstream:track)' \
    refs/heads |
    awk -F '\t' '$2 == "[gone]" { print $1 }'
)

if [[ -z "$gone_branches" ]]; then
  echo "No gone branches found."
  exit 0
fi

removed_worktrees=()
deleted_branches=()
skipped_branches=()

while IFS= read -r branch; do
  [[ -n "$branch" ]] || continue

  echo "Processing branch: $branch"

  worktree=$(worktree_for_branch "$branch")

  if [[ "$branch" == "$current_branch" || "$worktree" == "$repo_root" ]]; then
    echo "  Skipping current worktree branch: $branch"
    skipped_branches+=("$branch (checked out in current worktree)")
    continue
  fi

  if [[ -n "$worktree" ]]; then
    if $dry_run; then
      echo "  Would remove worktree: $worktree"
    else
      echo "  Removing worktree: $worktree"
    fi
    if ! $dry_run; then
      git worktree remove --force "$worktree"
    fi
    removed_worktrees+=("$worktree")
  fi

  if $dry_run; then
    echo "  Would delete branch: $branch"
  else
    echo "  Deleting branch: $branch"
  fi
  if ! $dry_run; then
    git branch -D "$branch"
  fi
  deleted_branches+=("$branch")
done <<<"$gone_branches"

echo
if $dry_run; then
  echo "Dry run complete. No changes were made."
else
  echo "Cleanup complete."
fi

if ((${#removed_worktrees[@]})); then
  if $dry_run; then
    printf 'Worktrees to remove:\n'
  else
    printf 'Removed worktrees:\n'
  fi
  printf '  %s\n' "${removed_worktrees[@]}"
fi

if ((${#deleted_branches[@]})); then
  if $dry_run; then
    printf 'Branches to delete:\n'
  else
    printf 'Deleted branches:\n'
  fi
  printf '  %s\n' "${deleted_branches[@]}"
fi

if ((${#skipped_branches[@]})); then
  printf 'Skipped branches:\n'
  printf '  %s\n' "${skipped_branches[@]}"
fi
