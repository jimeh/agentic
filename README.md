<div align="center">

# agentic

</div>

My personal AI coding agent configuration, with any quirks, oddities,
opinionated rules, and hallucination-inducing prompt fragments I live with
on a daily basis.

One repo, one set of rules, symlinked into every agent's config directory.
Supports [Claude Code], [Codex], and any tool that reads `AGENTS.md`.

> [!Warning]
>
> This is my personal config. It is not a starter kit, a
> framework, or a best-practices guide. If you use it as-is, things will
> probably work — but they'll work *my* way, which may not be *your* way.
> Browse for ideas, steal what's useful, but don't say I didn't warn you.

[Claude Code]: https://docs.anthropic.com/en/docs/claude-code
[Codex]: https://github.com/openai/codex

## Quick Start

```bash
git clone <repo-url> ~/.config/agentic
cd ~/.config/agentic
./setup.sh
```

This creates symlinks from the repo into `~/.claude/`, `~/.agents/`, and
`~/.codex/`. Existing files are skipped unless you pass `--force` (which
backs up originals to `.bak`).

```bash
./setup.sh --force  # replace existing configs (backs up to .bak)
```

## How It Works

`setup.sh` auto-discovers content and symlinks it into place:

| Source | Target(s) |
|---|---|
| `RULES.md` | `~/.claude/CLAUDE.md`, `~/.agents/AGENTS.md`, `~/.codex/AGENTS.md` |
| `claude/settings.json` | `~/.claude/settings.json` |
| `claude/statusline.sh` | `~/.claude/statusline.sh` |
| `codex/config.toml` | `~/.codex/config.toml` |
| `claude/commands/*.md` | `~/.claude/commands/` |
| `skills/*/` | `~/.claude/skills/`, `~/.agents/skills/` |

Stale symlinks (pointing to deleted sources) are cleaned up automatically on
each run.

## Structure

```
.
├── setup.sh                 # Installer — discovers and symlinks everything
├── RULES.md                 # Single source of truth for agent behavior
├── claude/
│   ├── settings.json        # Claude Code permissions and plugins
│   ├── statusline.sh        # Git status for Claude Code's status bar
│   └── commands/            # Slash commands (auto-discovered)
│       ├── commit.md
│       ├── commit-push-pr.md
│       ├── clean-gone-branches.md
│       ├── rebase.md
│       ├── claude-to-agents.md
│       ├── generate-agents.md.md
│       └── refactor-agents.md.md
├── codex/
│   └── config.toml          # Codex model, features, MCP servers
├── skills/                  # Custom skills (auto-discovered)
│   └── frontend-design-systems/
│       └── SKILL.md
└── docs/
    └── references/          # External articles and guides
```

## Key Concepts

### RULES.md — Single Source of Truth

All agent behavior rules live in one file. `setup.sh` symlinks it as each
tool's native instruction file (`CLAUDE.md` for Claude Code, `AGENTS.md` for
Codex and others). Edit `RULES.md` directly — never edit the symlink targets.

Covers: communication style, code style, comments, quality, git commits, PR
descriptions, dependencies, discovery documentation, and plan mode.

### Auto-Discovery

Drop a new `.md` file into `claude/commands/` or a new directory with a
`SKILL.md` into `skills/`, then re-run `setup.sh`. No manifest to update.

### Slash Commands

| Command | What it does |
|---|---|
| `/commit` | Stage and commit with conventional commit message |
| `/commit-push-pr` | Commit, push, and open a PR (renames branch if needed) |
| `/rebase` | Rebase onto upstream main/master with conflict handling |
| `/clean-gone-branches` | Delete local branches whose remote is gone |
| `/claude-to-agents` | Convert a project's `CLAUDE.md` to `AGENTS.md` |
| `/generate-agents.md` | Auto-generate hierarchical `AGENTS.md` for a repo |
| `/refactor-agents.md` | Refactor an existing `AGENTS.md` with progressive disclosure |

### Skills

| Skill | Description |
|---|---|
| `frontend-design-systems` | System-level visual decision rules for color ratios, typography, geometry, hierarchy, and constraints |

## Adding Your Own

**Command:** Create `claude/commands/my-command.md` with YAML frontmatter
and instructions, then run `setup.sh`.

**Skill:** Create `skills/my-skill/SKILL.md` with the skill definition,
then run `setup.sh`.

## Requirements

- Bash 3.2+ (macOS default works)
- `realpath`, `python3`, or `perl` for symlink resolution (at least one is
  typically available)

## License

This is a personal configuration repository. Feel free to use it as
inspiration for your own setup, but there are no guarantees it won't teach
your agents some questionable habits.
