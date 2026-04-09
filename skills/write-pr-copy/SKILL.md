---
name: write-pr-copy
description: >-
  Draft pull request titles and descriptions from repository context without
  creating, pushing, or submitting the pull request. Use when the user asks to
  write, draft, rewrite, polish, summarize, or fill in PR title/body text, or
  when a pull request template should be completed from the current branch
  changes.
---

# Write PR Copy

## Overview

Draft PR-ready title and description text from the current branch state. Focus
on writing clear, accurate copy that reflects the full scope of the branch
without opening, updating, or publishing the PR.

## Workflow

### 1. Gather Context

Run these commands to understand the branch before writing:

- `git status --short` — see changed files at a glance
- `git branch --show-current` — confirm the working branch
- `git log --oneline -10` — infer commit/title style from recent history
- `find . -maxdepth 3 -iname 'pull_request_template*' -o -ipath '*pull_request_template/*' 2>/dev/null`
  — locate PR templates

Then inspect the full branch scope, not just the last commit:

- Prefer `git diff main...HEAD` and `git log --oneline main..HEAD`
- Fall back to `master` if `main` is not present
- If another base is clearly correct from local context, use it
- If the base is still ambiguous, state the assumption briefly in the output

### 2. Use the Template When Present

If a PR template exists, use it as the body structure.

- Preserve meaningful headings and checklists unless the user asks for a rewrite
- If multiple templates exist and no obvious default stands out, ask which one
  to use
- Fill the template with concrete content from the branch instead of leaving
  generic placeholders

### 3. Write Copy, Not Commands

Produce PR copy only.

- Do not push, open, or update a pull request unless the user explicitly asks
- Do not enumerate commits one by one unless the user asks for that view
- Lead with the problem, context, or reason for the change before describing the
  implementation when that is supported by the available evidence
- Make it clear why the change is needed, not just what changed, but do not
  invent rationale that is not grounded in the diff, commits, template, or user
  request
- Match conventional-commit style titles when the repo history clearly uses them
- If the user asks only for a title or only for a description, return only that

### 4. Keep the Output Honest

- Keep the title to one clear line
- Keep the description concise, scannable, and grounded in the diff
- Open the description with a short explanation of the need, motivation, or
  user-facing context for the branch when that can be inferred from local
  evidence
- If the reason for the change is unclear and that context materially affects
  the PR copy, ask the user instead of guessing
- If the reason is still unknown, omit speculative context and stick to the
  confirmed scope of the changes
- Cover the branch as a coherent change, not a commit log
- Include testing notes only when they are supported by local evidence
- If testing is unknown or not run, say so plainly
- Note important assumptions when the diff or base branch leaves room for doubt

## Output Format

Follow the user's requested format when one is specified.

If the user does not specify a format and both fields are requested, use:

```md
Title
<one-line PR title>

Description
<PR body or completed template>
```

If the user asks for a rewrite of existing PR copy, preserve the intended facts
while improving clarity, structure, and emphasis.

If the user asks for a different structure, such as plain prose, separate
sections, bullets, or template-only content, match that instead of forcing the
default layout.

## Boundaries

Use this skill for drafting copy. If the user wants the pull request actually
created, pushed, or published, switch to the broader commit/push/PR workflow
instead of extending this skill beyond writing.
