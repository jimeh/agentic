---
name: rebase
description: >-
  Rebase the current branch onto a specified upstream branch or the live
  upstream default, review overlap, or resolve conflicts by intent during an
  in-progress rebase. Also use when publishing the resulting rewritten history
  may require a force-push. Use why for read-only explanations of why a conflict
  occurred; do not use for merge or cherry-pick conflicts.
---

# Git Rebase

Integrate the current branch with the user-specified upstream branch, or the
live upstream default when none was named, and check whether upstream changes
undercut the branch's design. A rebase may encounter conflicts; do not promise
automatic resolution or guess through semantic ambiguity.

Use `why` for a read-only explanation of why a conflict occurred. Use this skill
when resolving or continuing the rebase is part of the request.

Recreating commits is intrinsic to a rebase. Never push unless the user
explicitly requests it. A push request does not by itself authorize rewriting a
remote branch. If the user explicitly authorizes that force-push, use
`--force-with-lease`, never `--force`.

## Workflow

### 1. Detect the active Git operation

Inspect `git status` and resolve Git's operation markers with
`git rev-parse --git-path`.

- If a merge or cherry-pick is in progress, stop. This skill does not own those
  conflicts.
- If a rebase is already in progress, do not fetch or start another rebase.
  Inspect the current replayed commit and conflict state. If conflicts exist,
  read [references/conflict-resolution.md](references/conflict-resolution.md)
  before editing or staging anything, then resume the existing rebase from its
  current state.
- Otherwise, continue with the pre-rebase workflow below.

### 2. Resolve the live upstream base

Identify the current branch. If the user named a base branch, resolve that exact
branch against the live remote and use it. Do not silently replace it with the
default branch; stop if the name is missing or ambiguous.

When the user did not name a base, query the remote's live default branch rather
than trusting a possibly stale local `origin/HEAD`. For GitHub, use:

```bash
default_branch="$(gh repo view \
  --json defaultBranchRef \
  --jq '.defaultBranchRef.name' 2>/dev/null)" || true
if [ -z "$default_branch" ]; then
  default_branch="$(git ls-remote --symref origin HEAD 2>/dev/null |
    sed -n 's#^ref: refs/heads/\([^[:space:]]*\)[[:space:]][[:space:]]*HEAD$#\1#p')"
fi
base="origin/$default_branch"
```

Stop and ask if `default_branch` is empty and no other base is clearly correct.

### 3. Preserve status-visible dirt

Create a temporary snapshot outside the repository. Capture enough information
to prove exact restoration, not only the same path status:

- NUL-delimited porcelain v2 status for all staged, unstaged, and untracked
  paths
- index mode, object ID, and stage for every staged path
- file kind and existence for every status-visible path
- worktree content hashes for every present modified or untracked file

Record the snapshot location for cleanup. A path-only status comparison cannot
prove that stash restoration preserved file contents.

If the snapshot is non-empty, record the existing `refs/stash`, then create one
uniquely named owned stash that includes untracked files:

```bash
preexisting_stash="$(git rev-parse -q --verify refs/stash 2>/dev/null || true)"
git stash push --include-untracked -m "agent rebase: preserve working tree"
owned_stash="$(git rev-parse --verify refs/stash)"
```

Verify that the new stash exists and is not `preexisting_stash`. Stop if the
stash failed or the worktree did not become clean. Do not pop, drop, reorder, or
otherwise disturb any pre-existing stash.

After creating the owned stash, do not leave the user's work silently hidden on
an early exit. If no rebase is active, restore and verify it as described in
step 7. If a rebase remains active, retain the owned stash and report its object
ID and the exact recovery state.

### 4. Fetch and record the integration ranges

Fetch, then record the exact branch head and merge base used for review:

```bash
git fetch origin
pre_rebase_head="$(git rev-parse HEAD)"
pre_rebase_base="$(git merge-base HEAD "$base")"
pre_rebase_commit_count="$(
  git rev-list --count "$pre_rebase_base".."$pre_rebase_head"
)"
```

An empty old local range is valid and must not be forced through `range-diff`
later.

### 5. Review incoming upstream changes

Inspect the branch's paths, then the upstream commits and diffs that touched the
same files or nearby behavior:

```bash
git diff --name-only "$pre_rebase_base"...HEAD
git log --oneline --stat "$pre_rebase_base".."$base" -- <paths>
git diff --name-status "$pre_rebase_base".."$base" -- <paths>
```

For broad behavior, also search the upstream diff for relevant feature names,
symbols, config keys, migrations, routes, and tests. Determine whether upstream
already solved the same problem, introduced a new source of truth, removed a
local dependency, or would make the two implementations compete.

### 6. Rebase

Rebase onto the full upstream ref recorded above:

```bash
git rebase "$base"
```

If conflicts occur, read
[references/conflict-resolution.md](references/conflict-resolution.md) before
editing or staging anything. Preserve compatible upstream and local intent. If
the semantic choice is not supported by evidence or the user's stated goal,
leave an already-running rebase paused and ask. When this workflow started the
rebase, abort and restore the owned stash before asking unless the user
explicitly requested a paused state.

### 7. Restore the owned stash

After a successful rebase, if this workflow created a stash, restore only that
owned stash:

```bash
git stash apply --index "$owned_stash"
```

Recreate the same status, index-entry, file-kind, existence, and worktree-hash
snapshot after applying. If `git stash apply` fails, restoration conflicts, or
any snapshot differs, retain the owned stash and stop. Report the mismatch
without dropping anything. Only after every comparison succeeds, find the stash
entry whose object ID equals `owned_stash` and drop that exact entry. Leave all
pre-existing stashes untouched, then remove the temporary snapshot.

### 8. Review the integrated branch

Check the new branch against upstream:

```bash
git diff --check "$base"...HEAD
git diff --stat "$base"...HEAD
git rev-list --left-right --count "$base"...HEAD
git log --oneline "$base"..HEAD
post_rebase_commit_count="$(git rev-list --count "$base"..HEAD)"
```

Use `git range-diff "$pre_rebase_base".."$pre_rebase_head" "$base"..HEAD` only
when `pre_rebase_commit_count` and `post_rebase_commit_count` are both non-zero
and the ranges describe comparable replays. If either range is empty or not
comparable, use ahead/behind counts, the commit list, and targeted diffs
instead.

Confirm that the replayed commits still make sense on the new upstream design.
Adapt them during the rebase only when upstream makes the current changes wrong,
duplicate, inconsistent, or impossible to validate. Leave optional cleanup for
follow-up work.

### 9. Report the result

Show the updated history and report:

- the upstream ref used
- overlapping upstream changes and any local adaptation
- conflict choices and their tradeoffs
- validation performed
- restoration of the original staged, unstaged, and untracked path state
- any follow-up work or unresolved uncertainty

## Guidelines

- Keep output focused on evidence and decisions.
- Run independent read-only checks in parallel when useful.
- Preserve the existing abort-on-low-confidence behavior. Resolve a semantic
  conflict only when commit history, linked rationale, current constraints, or
  the user's stated goal supports the choice.
