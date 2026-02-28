# agents-md

Claude Code plugin for managing AGENTS.md files.

## Commands

### `/claude-md-to-agents-md`

Convert a project's `CLAUDE.md` into an agent-agnostic `AGENTS.md` file.
Claude-specific language is generalized (e.g. "Claude should..." becomes "Agents
should..."), while proper product names like "Claude Code" are left alone. The
original `CLAUDE.md` is replaced with a thin `@AGENTS.md` reference so Claude
Code still picks it up.

### `/generate-agents-md`

Analyze a codebase and generate a minimal, hierarchical AGENTS.md structure. The
agent performs a multi-phase analysis — repo type, tech stack, patterns, domain
concepts — then produces a root AGENTS.md (under ~100 lines) plus sub-folder
files where warranted. Uses progressive disclosure: detailed rules go into
`docs/agents/*.md` files rather than bloating the root. Also ensures a
`CLAUDE.md` exists with an `@AGENTS.md` reference so Claude Code picks up the
generated instructions. Treat the output as a starting point and trim
aggressively.

### `/refactor-agents-md`

Refactor an existing AGENTS.md (or CLAUDE.md) to follow progressive disclosure
principles. Finds contradictions, extracts essentials for the root file, groups
the rest into separate docs under `docs/agents/`, and flags instructions that
are redundant or too vague to be actionable. When refactoring an AGENTS.md,
ensures a `CLAUDE.md` exists with an `@AGENTS.md` reference.

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
