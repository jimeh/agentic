---
description: Convert a project's CLAUDE.md into an agent-agnostic AGENTS.md file, keeping CLAUDE.md as a thin @-reference
---

## Context

- Check if `CLAUDE.md` and `AGENTS.md` exist in the project root.
- Check if `CLAUDE.md` is a symlink (e.g., `ls -la CLAUDE.md`).

## Your Task

Convert this project's `CLAUDE.md` into an `AGENTS.md` file, and replace
`CLAUDE.md` with a thin reference to it.

## Steps

1. **Verify preconditions**:
   - If `CLAUDE.md` is a symlink pointing to `AGENTS.md`, skip to step 8.
   - If neither `CLAUDE.md` nor `AGENTS.md` exist, abort with an error message.
   - If `CLAUDE.md` does not exist but `AGENTS.md` does, skip to step 7.
   - If both exist, abort — suggest using `AGENTS.md` directly or removing it
     first.
   - Otherwise, `CLAUDE.md` exists and `AGENTS.md` does not — proceed.

2. **Read `CLAUDE.md`** content in full.

3. **Review content for references that need updating**:

   **Filename references**:
   - Headings like `# CLAUDE.md` → `# AGENTS.md`
   - Self-references like "this CLAUDE.md file" → "this AGENTS.md file"
   - Any other mentions of the filename that refer to the file itself and should
     change to reflect the new name

   **Generalize Claude-specific agent language**:
   - The title and opening paragraph often describe the file's purpose in
     Claude-specific terms (e.g., "This file provides guidance to Claude...").
     Rewrite these to be generic (e.g., "This file provides guidance to LLM
     agents...").
   - "Claude" (when referring to the AI agent performing tasks) → "LLM agents"
     or "agents"
   - "Tell Claude to..." → "Instruct agents to..."
   - "Claude should..." → "Agents should..."
   - "When Claude encounters..." → "When agents encounter..."
   - Similar phrasing that assumes a specific AI agent — rewrite to be
     agent-agnostic

   **Do NOT change**:
   - "Claude Code" — it's a proper product name (CLI tool)
   - References to Claude Code features, documentation, or capabilities (e.g.,
     `@`-references, slash commands)
   - "Claude" as part of a filename or path (e.g., `.claude/`, `CLAUDE.md`
     referring to other projects)
   - References to CLAUDE.md that refer to other projects' files or external
     concepts

4. **Write `AGENTS.md`** with the updated content.

5. **Replace `CLAUDE.md`** contents with just:
   ```
   @AGENTS.md
   ```
   This makes Claude Code load `AGENTS.md` via the `@`-reference.

6. **Summary**: Report what was done, including any references that were updated
   in step 3. Stop here.

7. **Create `CLAUDE.md` reference** (only reached when `CLAUDE.md` doesn't exist
   but `AGENTS.md` does):
   - Write a new `CLAUDE.md` in the project root containing just:
     ```
     @AGENTS.md
     ```
   - Report that `CLAUDE.md` was created as a reference to the existing
     `AGENTS.md`.

8. **Replace symlink with `@`-reference** (only reached when `CLAUDE.md` is a
   symlink to `AGENTS.md`):
   - Remove the `CLAUDE.md` symlink.
   - Write a new `CLAUDE.md` file containing just:
     ```
     @AGENTS.md
     ```
   - Report that the symlink was replaced with an `@`-reference to
     `AGENTS.md`.
