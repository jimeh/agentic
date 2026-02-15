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
./setup.sh            # create symlinks (skips existing)
./setup.sh --force    # replace existing (backs up to .bak)
```

This creates symlinks from the repo into `~/.claude/`, `~/.agents/`, and
`~/.codex/`. Run `./setup.sh --help` for details.

## What's Inside

- **`RULES.md`** — Single source of truth for all agent behavior rules.
  Symlinked as the global rules file for each supported agent. Edit this
  file directly — never edit the symlink targets.
- **`claude/`** — Claude Code settings, statusline script, and slash commands.
- **`codex/`** — OpenAI Codex config.
- **`skills/`** — Custom skills (auto-discovered by `setup.sh`).
- **`docs/references/`** — External articles and guides.

Commands and skills are auto-discovered — drop a file in the right place,
re-run `setup.sh`, done.

## Requirements

- Bash 3.2+ (macOS default works)
- `realpath`, `python3`, or `perl` for symlink resolution (at least one is
  typically available)

## License

This is a personal configuration repository. Feel free to use it as
inspiration for your own setup, but there are no guarantees it won't teach
your agents some questionable habits.
