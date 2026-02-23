---
allowed-tools: Read, Glob, Grep, Write, Edit
description: Address inline notes in plan.md (or research.md) and update the document — do NOT implement
argument-hint: "[optional additional guidance]"
---

## Context

- Plan file: !`find . -maxdepth 1 -name 'plan.md' 2>/dev/null`
- Research file: !`find . -maxdepth 1 -name 'research.md' 2>/dev/null`

## Your Task

The user has reviewed `plan.md` or `research.md` and added inline notes
directly into the document. Defaults to `plan.md`; if it doesn't exist
or the user specifies otherwise, refine `research.md` instead.

Read the document, find every note, address each one, and update it
accordingly.

Address ALL notes — don't skip any, even minor ones. If a note requires
restructuring a section, restructure it fully. If it references code
behavior, re-read the source to verify. Remove each note after addressing
it so the document reads cleanly when you're done.

If a note is ambiguous, make your best interpretation and flag it with a
brief `[Interpreted as: X — correct me if wrong]`.

Do NOT implement any changes. Only update the document.
