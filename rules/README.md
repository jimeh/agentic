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

| Source        | Output        | Composition             |
| ------------- | ------------- | ----------------------- |
| `claude.md`   | `CLAUDE.md`   | base, codegraph         |
| `codex.md`    | `CODEX.md`    | base, agents, codegraph |
| `opencode.md` | `OPENCODE.md` | base, agents, codegraph |

`base.md` is shared by every target. `agents.md` holds guidance shared by
non-Claude agents; it is currently empty and exists so Codex and opencode have a
common place for rules that should not reach Claude. `codegraph.md` holds the
CodeGraph guidance shared by every target. Shared RTK guidance lives in
`base.md`, keeping its stdin and shell data-flow safety rule consistent across
all harnesses.

## Building

```bash
mise run rules:build
mise run rules:check
```

`rules:check` runs as part of `mise run lint`. Do not edit `../generated/`
directly.
