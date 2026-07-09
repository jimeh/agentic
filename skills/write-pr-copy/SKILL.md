---
name: write-pr-copy
description: >-
  Draft pull request titles and descriptions from repository context without
  creating, pushing, or submitting the pull request. Use when the user asks to
  write, draft, rewrite, polish, summarize, or fill in PR title/body text, or
  when a pull request template should be completed from the current branch
  changes. Always detect and read repository pull request templates before
  drafting the PR body.
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

Then inspect the full branch scope, not just the last commit:

- Prefer `git diff main...HEAD` and `git log --oneline main..HEAD`
- Fall back to `master` if `main` is not present
- If another base is clearly correct from local context, use it
- If the base is still ambiguous, state the assumption briefly in the output

### 2. Detect PR Template

Always run a PR template search before writing the PR body, even if you do not
expect one to exist.

```bash
find . -maxdepth 4 \
  \( -path './.git' -o -path './node_modules' -o -path './vendor' \) -prune \
  -o \( -iname 'pull_request_template*' \
  -o -ipath '*/pull_request_template/*' \) -print 2>/dev/null
```

Record the result as one of:

- `No PR template found`
- `One PR template found: <path>`
- `Multiple PR templates found: <paths>`

If one template is found, read it and use it as the body structure. If multiple
templates are found and no obvious default exists, ask which one to use.

When using a template:

- Preserve meaningful headings and checklists unless the user asks for a rewrite
- Fill the template with concrete content from the branch instead of leaving
  generic placeholders
- Do not include template status metadata in the PR copy, including lines like
  `No PR template found`, `PR template: No PR template found`, or the path of
  the selected template unless the template explicitly asks for it

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
- Prefer PR title wording that would read well as a bullet in a user-facing
  changelog when the change has user-visible impact. For internal-only changes,
  frame the title around the durable project outcome rather than the
  implementation task.
- Include manual QA steps only when they are useful, concrete, and tied to the
  behavior changed by the branch. Prefer reviewer workflows or user-visible
  scenarios over commands. Do not fill manual QA with generic test commands, CI
  commands, or "CI should pass".
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
- Never include machine-local details in a PR title or body: absolute local
  filesystem paths, usernames, home directories, host-specific locations, or
  similar local-only context.
- Include a Testing section only when actual validation results provide useful
  context to reviewers. Mention commands only when they were actually run and
  their results are meaningful; keep Testing notes distinct from Manual QA.
- For docs-only or content-only changes, omit Testing when it would merely list
  generic lint, format, test, or CI-equivalent commands, unless the selected PR
  template requires the section.
- If the selected PR template requires a Testing section and validation was not
  run or is unknown, state that plainly without inventing commands or results.
- When useful validation involved a machine-local path, rewrite the note with a
  repository-relative command or path, or concise prose; never copy the raw
  local invocation.
- Note important assumptions when the diff or base branch leaves room for doubt
- Do not mention template status in generated PR copy; it is internal workflow
  state, not reviewer context

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
