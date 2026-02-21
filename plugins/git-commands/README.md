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

## Install

```bash
# Add the marketplace (once)
claude plugin marketplace add jimeh/agentic

# Install the plugin
claude plugin install git-commands@jimeh-agentic
```

Or from within Claude Code:

```text
/plugin marketplace add jimeh/agentic
/plugin install git-commands@jimeh-agentic
```

## Origins

`commit`, `commit-push-pr`, and `clean-gone-branches` are derived from the
official `commit-commands` plugin (anthropics/claude-plugins-official), heavily
modified.
