---
allowed-tools: Bash(git checkout --branch:*), Bash(git checkout -b:*), Bash(git branch -m:*), Bash(git add:*), Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git push:*), Bash(git commit:*), Bash(gh pr create:*), Bash(find:*), Bash(cat:*)
description: Commit, push, and open a PR, rename branch appropriately if needed
source: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/commit-commands/commands/commit-push-pr.md
notes: Heavily modified from the original.
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`
- PR template search:
  !`find . -maxdepth 4 \( -path './.git' -o -path './node_modules' -o -path './vendor' \) -prune -o \( -iname 'pull_request_template*' -o -ipath '*/pull_request_template/*' \) -print 2>/dev/null`

## Your Task

Based on the above changes:

1. **Check agent docs**: If the project has an AGENTS.md or CLAUDE.md, review it
   against the current changes. If the changes introduce new conventions,
   commands, architecture, or patterns that should be documented (or invalidate
   existing docs), update the relevant file as part of this commit. Only update
   if clearly warranted — don't add noise. Things worth documenting:
   - Non-obvious conventions or patterns not apparent from code structure alone
   - Surprising behaviors, gotchas, or workarounds discovered during development
   - Implicit dependencies or ordering constraints between components
   - Environment-specific quirks (platform differences, tool version
     sensitivities)
   - Undocumented requirements or constraints found through trial and error
2. **Branch**: If on `main`, `master`, or the repository's default/protected
   branch, create a new branch named for the changes with
   `git checkout -b <descriptive-name>`. Never rename these branches.
3. **Branch name**: Only use `git branch -m <descriptive-name>` when already on
   a non-main branch whose name appears generated, random, or unrelated to the
   current work, such as UUIDs, hex strings, meaningless sequences, or 1-3
   unrelated words like "brave-fox". If the branch name is meaningful or
   user-provided, keep it.
4. **Commit**: Stage all relevant changes and create a single commit with a
   conventional commit message. Lead with why over what — the body should start
   with the reason for the change; technical overview and implementation notes
   come after. If the rationale is unclear, do not guess; ask the user. If asked
   to commit only staged changes, run `git diff --staged` and base the message
   solely on those — do NOT stage additional files. Never stage or commit files
   ignored by git unless the user explicitly asks. Do not use `git add -f`,
   `git add --force`, or equivalent to include ignored files.
5. **Push** the branch to origin.
6. **Understand full scope**: Run `git log` and `git diff main...HEAD` (or
   master) to see all changes since the base branch.
7. **PR template**: Determine whether the PR template search found no template,
   one template, or multiple templates. If one template was found, read it
   before drafting the PR body and use it as the body structure. If multiple
   templates were found and no obvious default exists, ask which one to use. Do
   not run `gh pr create` until template status is known. Template detection is
   internal workflow state: do not include lines like `No PR template found`,
   `PR template: No PR template found`, or selected template paths in the PR
   title/body unless the repository template explicitly asks for it.
8. **Create PR** with `gh pr create`. Lead the description with the motivation
   and purpose behind the change — before technical details — then cover the
   implementation across the full scope of all commits. If the rationale is
   unclear, do not guess; stick to the confirmed scope or ask the user. Preserve
   meaningful template headings and checklists when a template is used. Do NOT
   list individual commits — the PR already shows those. Prefer title wording
   that would read well as a bullet in a user-facing changelog when the change
   has user-visible impact; for internal-only changes, frame the title around
   the durable project outcome rather than the implementation task. Include
   manual QA only when there are useful, concrete reviewer workflows or
   user-visible scenarios tied to the branch. Do not fill manual QA with generic
   test commands, CI commands, or "CI should pass".

   Apply these PR copy hygiene rules:
   - Never include machine-local details in a PR title or body: absolute local
     filesystem paths, usernames, home directories, host-specific locations, or
     similar local-only context.
   - Include a Testing section only when actual validation results provide
     useful context to reviewers. Mention commands only when they were actually
     run and their results are meaningful; keep Testing notes distinct from
     Manual QA.
   - For docs-only or content-only changes, omit Testing when it would merely
     list generic lint, format, test, or CI-equivalent commands, unless the
     selected PR template requires the section.
   - If the selected PR template requires a Testing section and validation was
     not run or is unknown, state that plainly without inventing commands or
     results.
   - When useful validation involved a machine-local path, rewrite the note with
     a repository-relative command or path, or concise prose; never copy the raw
     local invocation.

Before creating the PR, verify:

- The PR template search command was run
- Any matched template file was read
- The PR body follows the selected template, or no template was found
- The PR title and body do not include template-search metadata
- The PR title and body contain no machine-local details
- Any Testing section adds useful reviewer context or is required by the
  template

## Guidelines

- Use parallel tool calls where possible to minimize round-trips
- Prefer conventional commits format, but defer to project conventions
- Pass commit messages and PR bodies via heredocs to avoid shell interpretation
  of backticks and other special characters in multi-line strings
- Treat `.gitignore` and other git exclude rules as authoritative for default
  commit scope
- Minimize text output — focus on tool calls

Do all of the above in a single message using parallel tool calls where
possible. Do not send any other text or messages besides tool calls.
