# git-commands

Claude Code plugin providing git workflow slash commands.

## Commands

### `/commit`

Create a git commit with a conventional commit message. Before committing,
the agent checks if the project's AGENTS.md or CLAUDE.md needs updates to
reflect the changes (new conventions, architecture, patterns). If you have
staged changes, pass that intent and only those changes are committed —
otherwise all relevant changes are staged.

### `/commit-push-pr`

Commit, push, and open a pull request in one step. If on main/master, a new
branch is created. If the current branch name looks randomly generated, it's
renamed to something descriptive. After committing, the agent runs
`git diff main...HEAD` to understand the full scope across all commits, uses
any PR template found in the repo, and creates the PR via `gh`.

### `/rebase`

Rebase the current branch onto the upstream default branch (main or master).
Uncommitted changes are auto-stashed beforehand and restored after. If the
rebase hits conflicts, the agent attempts to resolve them — and aborts
cleanly if confidence is low, leaving the working tree as it was found.

### `/clean-gone-branches`

Remove local branches whose remote tracking branch is marked `[gone]`
(deleted on remote). Also removes any associated worktrees before deleting
the branch. Reports what was cleaned up, or that no cleanup was needed.

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
official [`commit-commands`] plugin, heavily modified.

[`commit-commands`]: https://github.com/anthropics/claude-plugins-official/tree/main/plugins/commit-commands
