# Global Rule Sources

Each rendered file in `../generated/` is produced from a Markdown source in this
directory that declares itself a render target:

```markdown
---
type: agentic-rules
filename: CLAUDE.md
---

<!-- include: base.md -->
```

`type: agentic-rules` marks the file as a target and `filename` names its output
in `../generated/`. Files without that frontmatter are include-only, so adding a
target is a matter of creating a file rather than editing TypeScript.

`<!-- include: path -->` inlines another file, resolved relative to the file
containing the directive. Includes may nest, must stay inside this directory,
and cycles are rejected.

## Layout

| Source        | Output        | Composition  |
| ------------- | ------------- | ------------ |
| `claude.md`   | `CLAUDE.md`   | base         |
| `codex.md`    | `CODEX.md`    | base, agents |
| `opencode.md` | `OPENCODE.md` | base, agents |

`base.md` is shared by every target. `agents.md` holds guidance shared by
non-Claude agents, for rules that should not reach Claude. CodeGraph guidance
lives in the AGENTS.md of indexed repositories, not in the global rules.

## Building

```bash
mise run rules:build
mise run rules:check
```

`rules:check` runs as part of `mise run lint`. Do not edit `../generated/`
directly.
