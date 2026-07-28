---
name: commit-push-pr
description: >-
  Commit, push, and open a pull request in one workflow. Owns template
  detection, push, and PR creation; defers commit conventions to the commit
  skill and PR title/body guidance to write-pr-copy.
---

# Git Commit, Push & PR

Commit current changes, push to remote, and open a pull request in a single
workflow.

This skill owns the sequence and the `gh` mechanics. It deliberately does not
restate conventions that live elsewhere:

- **Commit guidance** — the `commit` skill: context gathering, the agent-docs
  check, message conventions, staged-only mode, ignored-file rules.
- **PR title and body** — the `write-pr-copy` skill: template handling,
  motivation-first descriptions, Manual QA, copy hygiene, honesty rules.

## Workflow

### 1. Resolve the Base

Follow the live default-branch resolution in the `write-pr-copy` skill and
record both the branch name and its full remote ref before changing repository
or remote state. Stop if the base remains ambiguous.

### 2. Commit

Follow the `commit` skill end to end, with one addition it leaves conditional:
if the current branch is `main`, `master`, or the resolved default or protected
branch, create a branch named for the changes with
`git checkout -b <descriptive-name>` before committing. Never rename those
branches.

### 3. Push

Push the branch to origin with `git push -u origin <branch>`.

### 4. Understand Full Scope

Use the recorded full remote ref as `base`. Read every change the branch
carries, since the PR describes the branch and not the latest commit:

```bash
git log --oneline "$base"..HEAD
git diff "$base"...HEAD
```

### 5. Write the Copy

Follow the `write-pr-copy` skill to produce the title and body, including its PR
template detection. Do not run `gh pr create` before the template status is
known.

### 6. Create the PR

Open it with `gh pr create`, using that title and body.

Before creating, verify:

- the PR template search was run, and any matched template was read
- the body follows the selected template, or no template was found
- title and body carry no template-search metadata and no machine-local details
- any Testing section adds real reviewer context, or is required by the template

## Guidelines

- Use parallel tool calls where possible to minimize round-trips
- Minimize text output — focus on tool calls
- Pass commit messages and PR bodies via heredocs to avoid shell interpretation
  of backticks and other special characters in multi-line strings
