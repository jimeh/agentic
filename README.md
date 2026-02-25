<div align="center">

# agentic

</div>

My personal AI coding agent configuration, with any quirks, oddities,
opinionated rules, and hallucination-inducing prompt fragments I live with on a
daily basis.

One repo, one set of rules, symlinked into every agent's config directory.
Supports [Claude Code], [Codex], and any tool that reads `AGENTS.md`.

> [!Warning]
>
> This is my personal config. It is not a starter kit, a framework, or a
> best-practices guide. If you use it as-is, things will probably work — but
> they'll work _my_ way, which may not be _your_ way. Browse for ideas, steal
> what's useful, but don't say I didn't warn you.

[Claude Code]: https://docs.anthropic.com/en/docs/claude-code
[Codex]: https://github.com/openai/codex

## Quick Start

```bash
git clone https://github.com/jimeh/agentic.git ~/.config/agentic
cd ~/.config/agentic
./setup.sh            # create symlinks (skips existing)
./setup.sh --force    # replace existing (backs up to .bak)
```

This creates symlinks from the repo into `~/.claude/`, `~/.agents/`, and
`~/.codex/`, and registers plugin marketplaces and installs plugins via the
Claude CLI. Run `./setup.sh --help` for details.

## What's Inside

- **`RULES.md`** — Single source of truth for all agent behavior rules.
  Symlinked as the global rules file for each supported agent. Edit this file
  directly — never edit the symlink targets.
- **`claude/`** — Claude Code settings and statusline script.
- **`codex/`** — OpenAI Codex config.
- **`skills/`** — Custom skills (auto-discovered by `setup.sh`).
- **`plugins/`** — Claude Code plugins, published via a local marketplace.
- **`docs/references/`** — External articles and guides.

Skills are auto-discovered — drop a directory in the right place, re-run
`setup.sh`, done. Commands live in plugins. Plugins are registered and installed
via the Claude CLI (`claude plugin marketplace add` / `claude plugin install`).

## Plugins

### [strip-git-cwd](plugins/strip-git-cwd/)

A `PreToolUse` hook that strips redundant `git -C <cwd>` flags from Bash
commands when the path matches the current working directory. Claude Code tends
to add these unnecessarily, and the `-C` flag changes the command string enough
that pre-approved git commands no longer match the allowlist — causing repeated
permission prompts.

Handles all `-C` syntax variants (space, `=`, bare, quoted) and compound
commands (`&&`, `;`).

### [git-commands](plugins/git-commands/)

Slash commands for common git workflows:

- `/commit` — Stage changes, create a well-formed commit.
- `/commit-push-pr` — Commit, push, and open a PR.
- `/rebase` — Rebase onto upstream main/master.
- `/clean-gone-branches` — Clean up branches deleted on remote.

Derived from the official `commit-commands` plugin, heavily modified.

### [agents-md](plugins/agents-md/)

Slash commands for managing AGENTS.md files:

- `/claude-md-to-agents-md` — Convert CLAUDE.md to AGENTS.md.
- `/generate-agents-md` — Generate AGENTS.md from codebase analysis.
- `/refactor-agents-md` — Refactor AGENTS.md for progressive disclosure.

### [phased-work](plugins/phased-work/)

A disciplined research-plan-implement workflow. Instead of jumping straight to
code, you move through distinct phases so every decision is reviewed before
implementation begins.

- `/research` — Deep-read a codebase area, write findings to `research.md`.
- `/plan` — Create a detailed implementation plan in `plan.md`.
- `/refine` — Address inline notes you've added to the plan.
- `/todo` — Add a granular task breakdown to the plan.
- `/implement` — Execute the plan mechanically, marking progress.
- `/review` — Optional post-implementation sanity check.

Also includes [agent-agnostic prompt snippets](plugins/phased-work/snippets.md)
for use with any AI coding assistant.

### Standalone Installation

You can install individual plugins directly without cloning the repo. First add
the marketplace, then install whichever plugins you want:

```bash
# CLI
claude plugin marketplace add jimeh/agentic

# Or from within Claude Code
/plugin marketplace add jimeh/agentic
```

Then install plugins:

```bash
# CLI
claude plugin install git-commands@jimeh-agentic

# Or from within Claude Code
/plugin install git-commands@jimeh-agentic
```

### Installation via setup.sh

`setup.sh` ensures both the official `claude-plugins-official` marketplace and
this repo's local marketplace are registered, then installs plugins listed in
the `CLAUDE_PLUGINS` array at the top of the script. To add or remove
auto-installed plugins, edit that array.

Requires the `claude` CLI and `jq`. Skipped gracefully if either is missing.

## Requirements

- Bash 3.2+ (macOS default works)
- For symlink resolution, `setup.sh` tries `realpath` first, then
  platform-specific fallbacks:
  - **macOS**: `python3`, `python`, `perl`, or `readlink`
  - **Linux**: `readlink -f` (part of coreutils)

## License

This is a personal configuration repository. Feel free to use it as inspiration
for your own setup, but there are no guarantees it won't teach your agents some
questionable habits.
