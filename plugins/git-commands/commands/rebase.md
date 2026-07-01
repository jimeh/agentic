---
allowed-tools: Bash(git fetch:*), Bash(git rebase:*), Bash(git stash:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git range-diff:*), Bash(git show:*), Bash(git grep:*), Read, Edit
description: Rebase current branch and review upstream integration
---

## Context

- Current branch: !`git branch --show-current`
- Default branch: !`git rev-parse --abbrev-ref origin/HEAD 2>/dev/null`
- Uncommitted changes: !`git status --short`

## Your Task

Rebase the current branch onto the upstream default branch. Treat this as
integration work, not just history movement: new upstream commits may already
solve part of the same problem, change the surrounding design, or make local
commits too broad.

This command mirrors `skills/rebase/SKILL.md`; keep the behavior aligned with
that skill.

1. If there are uncommitted changes, stash them first with
   `git stash push -m "auto-stash before rebase"`.
2. Fetch the latest from origin: `git fetch origin`.
3. Use the `origin/HEAD` output as the full upstream ref, for example
   `origin/main`. Do not prepend another `origin/` to it.
4. Before rebasing, record:
   - upstream ref: `git rev-parse --abbrev-ref origin/HEAD`
   - pre-rebase head: `git rev-parse HEAD`
   - pre-rebase base: `git merge-base HEAD <upstream-ref>`
5. Review what landed upstream since the branch's current base:
   - identify the branch surface with
     `git diff --name-only <pre-rebase-base>...HEAD`
   - inspect upstream commits touching the same files or nearby systems with
     `git log --oneline --stat <pre-rebase-base>..<upstream-ref> -- <paths>`
   - inspect upstream file changes with
     `git diff --name-status <pre-rebase-base>..<upstream-ref> -- <paths>`
   - if the branch touches broad behavior, search the upstream diff or current
     tree for related feature names, functions, config keys, migrations, routes,
     or tests
6. Rebase onto the full upstream ref: `git rebase <upstream-ref>`.
7. If the rebase succeeds and changes were stashed in step 1, run
   `git stash pop`.
8. After the rebase, check whether the branch still makes sense on top of the
   new upstream state:
   - `git range-diff <pre-rebase-base>..<pre-rebase-head> <upstream-ref>..HEAD`
   - `git diff --check <upstream-ref>...HEAD`
   - `git diff --stat <upstream-ref>...HEAD`
   - if `range-diff` is unavailable or noisy, use
     `git log --oneline <upstream-ref>..HEAD` and targeted
     `git diff <upstream-ref>...HEAD -- <paths>`
9. Show the result with `git log --oneline -10`.

While reviewing upstream changes, ask:

- Did upstream already implement the same fix, even in narrower form?
- Did upstream introduce a new abstraction, convention, or source of truth that
  local commits should now use?
- Did upstream remove, rename, or restructure code that local commits still
  depend on?
- Would keeping both upstream and branch-local implementations create duplicate
  behavior, competing configuration, or inconsistent validation?

Adapt the branch during the rebase only when the upstream changes make the
current changeset wrong, duplicate, inconsistent, or impossible to validate. If
the rebased branch still works but could be simplified to use the new upstream
approach, finish the rebase and report that as follow-up work instead of
expanding the rebase scope.

If the rebase fails due to conflicts, attempt to resolve them yourself. If you
have low confidence in the resolution, abort the rebase with
`git rebase --abort`, restore any stashed changes with `git stash pop`, and ask
the user to resolve manually — leaving the working tree as it was found.

When resolving conflicts:

1. Inspect both sides of the conflict and the upstream commits that introduced
   the conflicting code.
2. Prefer the upstream design when it now provides the broader source of truth,
   unless the local branch intentionally extends it.
3. Resolve conflicts so the final branch has one coherent implementation, not
   both versions side by side.
4. After resolving, stage the files and run `git rebase --continue`.

## Guidelines

- Never force-push without explicit user confirmation
- Keep the final response concise, but include:
  - upstream ref used
  - whether overlapping upstream changes were found
  - whether local commits were adapted
  - recommended follow-up refactors, if any

Use tool calls for git operations. Do not do unrelated work.
