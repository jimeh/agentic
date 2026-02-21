# agents-md

Claude Code plugin for managing AGENTS.md files.

## Commands

- `/claude-md-to-agents-md` -- Convert a project's CLAUDE.md into an
  agent-agnostic AGENTS.md, leaving CLAUDE.md as a thin @-reference.
- `/generate-agents-md` -- Analyze a codebase and generate a hierarchical
  AGENTS.md with progressive disclosure.
- `/refactor-agents-md` -- Refactor an existing AGENTS.md to follow
  progressive disclosure principles.

## Install

```bash
# Add the marketplace (once)
claude plugin marketplace add jimeh/agentic

# Install the plugin
claude plugin install agents-md@jimeh-agentic
```

Or from within Claude Code:

```text
/plugin marketplace add jimeh/agentic
/plugin install agents-md@jimeh-agentic
```
