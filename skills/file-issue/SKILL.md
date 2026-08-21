---
name: file-issue
description: >-
  Create a GitHub issue in a repository. Use when the user asks to file, open,
  create, or publish a GitHub issue or ticket. Do not maintain an existing issue
  or file work in a non-GitHub tracker.
---

# File issue

Create the requested GitHub issue from verified context. This workflow
authorizes the issue creation and requested metadata, but not code changes,
commits, pushes, comments, edits to pre-existing issues, project administration,
or closing issues.

## Resolve the target

Read the repository instructions, then resolve the GitHub host and repository.
An explicit target wins. Otherwise inspect the current repository, remotes, and
read-only GitHub metadata rather than assuming `origin` is the intended issue
tracker. Ask when a fork, multiple plausible remotes, or another ambiguity could
send the issue to the wrong repository.

Confirm that the repository has issues enabled and determine its visibility.
Stop before publication if the proposed content may expose credentials, private
data, security-sensitive details, or information unsuitable for that visibility.

Do not create more issues than the user requested. Search open and closed issues
for the same problem or outcome before filing. If a plausible duplicate exists,
return it and explain the overlap. Create another issue only when the user
explicitly confirms that distinction or duplication is intended.

## Prepare the issue

Read the issue templates and chooser configuration from the live default branch.
Select a template only when the request or evidence makes the choice clear. Ask
when multiple templates plausibly apply. Respect contact links, disabled blank
issues, required issue-form fields, and required attestations. Never invent a
required answer.

Use `write-issue-copy` for the title and description, including its provenance
footer when the agent authored or materially rewrote the description. Supply it
with the selected template, repository context, verified evidence, and any
existing user-provided copy.

Apply metadata that the user explicitly requested or the selected template
declares. Labels and issue type may also follow an unambiguous repository
convention. Do not infer assignees, milestones, projects, parent issues, or
blocking relationships. Do not create missing labels, milestones, projects, or
issue types. Preflight every requested value and required permission before
creating the issue.

## Create and verify

Create the issue non-interactively. Pass the final body through a temporary file
or literal stdin mechanism that preserves it exactly; never interpolate issue
prose into a shell command. Do not combine `gh issue create --template` with
`--body` or `--body-file`. Render the selected template into the final body and
apply its supported metadata explicitly.

Some `gh issue create` metadata, including issue type and issue relationships,
may be applied after GitHub creates the base issue. If creation reports an
error, do not retry until read-only inspection establishes whether the issue
already exists and which metadata landed. Never create a second issue while the
first attempt remains uncertain.

Immediately read the created issue back once. Verify its repository, URL, title,
body, state, and requested metadata, including relationships when applicable.
Correct a mismatch once when the requested mutation is safe and authorized. If
the issue exists but a requested field could not be applied, preserve the issue
and report the partial result rather than hiding it or creating another.

Return the issue URL, state, and a concise summary of applied or missing
metadata. Do not wait for responses, add comments, change project state, or
start implementation unless the user separately authorized another workflow that
owns those actions.
