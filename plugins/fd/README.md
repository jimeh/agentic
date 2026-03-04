# fd

Claude Code plugin that sets up a lightweight Feature Design (FD) tracking
system in any project. Provides slash commands for creating, exploring,
managing, and closing feature designs with parallel analysis capabilities.

Based on the
[Feature Design system by manuelschipper](https://gist.github.com/manuelschipper/149ebf6b2d150ccaccc84ee9a9df560f).

## What It Does

The `/fd-init` command scaffolds a complete feature tracking system into your
project:

- `docs/features/` directory with index and templates
- Slash commands for the full FD lifecycle
- CLAUDE.md conventions for consistent behavior
- Optional changelog integration

Once initialized, the project-local slash commands handle the workflow:

| Command       | Purpose                                                   |
| ------------- | --------------------------------------------------------- |
| `/fd-new`     | Create a new feature design                               |
| `/fd-explore` | Explore project overview, FD history, recent activity     |
| `/fd-deep`    | Deep parallel analysis (4 agents explore + synthesize)    |
| `/fd-status`  | Show active FDs with status and grooming                  |
| `/fd-verify`  | Post-implementation: commit, proofread, verify            |
| `/fd-close`   | Complete/close an FD, archive, update index and changelog |

## Install

```bash
# Add the marketplace (once)
claude plugin marketplace add jimeh/agentic

# Install the plugin
claude plugin install fd@jimeh-agentic
```

Or from within Claude Code:

```text
/plugin marketplace add jimeh/agentic
/plugin install fd@jimeh-agentic
```
