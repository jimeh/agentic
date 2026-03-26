---
description: Copy EDD commands, agents, and skill into the local project for portability
allowed-tools: Bash(mkdir:*), Bash(cp:*), Bash(ln -s:*), Bash(ls:*)
argument-hint: ""
---

## Your Task

Copy all EDD commands, agents, and the skill into the local project so they work
without the plugin installed.

### Source Locations

All source paths are relative to `${CLAUDE_PLUGIN_ROOT}`:

- **Commands**: `commands/*.md`
- **Skill**: `skills/edd/SKILL.md` and `skills/edd/references/*`
- **Agents**: `agents/*.md`

### Destination Layout

All destination paths are relative to the project root (working directory):

```text
.claude/commands/              ← command .md files
.claude/skills/edd/            ← SKILL.md + references/
.claude/agents/                ← agent .md files
```

### Step 1: Copy Commands

Copy each `.md` file from `${CLAUDE_PLUGIN_ROOT}/commands/` into
`.claude/commands/`. **Exclude** `edd-init.md` and `edd-embed.md` — they only
make sense as plugin commands.

Create the destination directory first with `mkdir -p`.

### Step 2: Copy Skill

Remove `.claude/skills/edd/` if it exists (clean slate — prevents stale files
from a previous embed). Then:

1. Create `.claude/skills/edd/references/` with `mkdir -p`
2. Copy `${CLAUDE_PLUGIN_ROOT}/skills/edd/SKILL.md` →
   `.claude/skills/edd/SKILL.md`
3. Copy all files from `${CLAUDE_PLUGIN_ROOT}/skills/edd/references/` →
   `.claude/skills/edd/references/`

### Step 3: Copy Agents

1. Create `.claude/agents/` with `mkdir -p`
2. Copy all `.md` files from `${CLAUDE_PLUGIN_ROOT}/agents/` → `.claude/agents/`

### Step 4: Report

Tell the user what was copied and where. Remind them:

- These embedded copies are **snapshots** — if the EDD plugin updates, run
  `/edd-embed` again to refresh them
- Commands in `.claude/commands/` are available as local slash commands
- The skill in `.claude/skills/edd/` is auto-discovered by Claude Code
- Agent definitions in `.claude/agents/` are auto-discovered by Claude Code
