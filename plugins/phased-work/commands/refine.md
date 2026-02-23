---
allowed-tools: Read, Glob, Grep, Write, Edit
description: Address inline notes in plan.md and update the plan — do NOT implement
argument-hint: "[optional additional guidance]"
---

## Context

- Plan file: !`find . -maxdepth 1 -name 'plan.md' 2>/dev/null`

## Your Task

The user has reviewed `plan.md` (or a filename they specify) and added
inline notes directly into the document. Read the plan, find every note,
address each one, and update the plan accordingly.

Address ALL notes — don't skip any, even minor ones. If a note requires
restructuring a section, restructure it fully. If it references code
behavior, re-read the source to verify. Remove each note after addressing
it so the plan reads cleanly when you're done.

If a note is ambiguous, make your best interpretation and flag it with a
brief `[Interpreted as: X — correct me if wrong]`.

Do NOT implement any changes. Only update the plan document.
