# git-commands

Claude Code plugin providing git workflow slash commands.

## Commands

- `/commit` -- Create a git commit with conventional commit messages. Checks
  agent docs for needed updates.
- `/commit-push-pr` -- Commit, push to origin, and open a PR via `gh`. Handles
  branch naming and PR templates.
- `/rebase` -- Rebase the current branch onto upstream main/master, with
  auto-stash and conflict resolution.
- `/clean-gone-branches` -- Remove local branches marked [gone] (deleted on
  remote), including associated worktrees.

## Origins

`commit`, `commit-push-pr`, and `clean-gone-branches` are derived from the
official `commit-commands` plugin (anthropics/claude-plugins-official), heavily
modified.
