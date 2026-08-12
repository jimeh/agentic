---
name: file-pr
description: >-
  Create a GitHub pull request for the current branch. Use when the user asks to
  file, open, create, or publish a PR, including pushing its committed branch.
  Pair with `commit` only when the request also authorizes committing. Do not
  maintain an already-open pull request.
---

# File PR

Push committed work and create its pull request. This workflow authorizes the
needed branch push and PR creation, but not new commits, force-pushes, reviews,
merges, deployments, or releases.

## Resolve the Branch and Base

Read the repository instructions and inspect the working tree, current branch,
remotes, tracking state, and any existing PR for the head branch. Resolve the
live remote default branch when the user did not supply a base.

Do not create a duplicate PR. If one already exists, return it and update it
only when the user explicitly asked.

Determine whether a new branch is required before committing or pushing. When
the current branch is protected or is the target base, create a descriptive
feature branch following repository conventions. If relevant work remains
uncommitted and the same request did not authorize committing, stop before
creating the branch; otherwise create it before using `commit`. Never rename a
meaningful user-provided branch.

If relevant work remains uncommitted, use `commit` only when the same request
authorized committing; otherwise stop.

Refresh the remote base and inspect the full branch log and three-dot diff. Stop
if the intended base or branch scope remains materially ambiguous.

## Prepare the Pull Request

Find and read the applicable pull request template before writing the body. If
multiple templates exist without a clear default, ask which one to use.

Use `write-pr-copy` for the title and description, including its required
provenance footer. Verify that the copy reflects the whole branch, contains no
template-discovery or machine-local details, and reports only validation that
actually occurred.

Respect an explicit draft or ready-state request. Otherwise create a normal
ready-for-review pull request when the branch is complete and verified; use a
draft when known work or material validation remains.

## Push and Create

Push the current branch to the selected remote with upstream tracking, then
create the pull request using the prepared title, body, base, and draft state.
Pass the body through a temporary file or literal stdin mechanism that preserves
it exactly; never interpolate PR prose into a shell command. Follow the shell
rules for any command that consumes stdin.

Immediately read the created pull request back once and verify its URL, title,
body, base, head, and draft state. Correct a mismatch, but do not add retry
loops for historical transport bugs.

Return the PR URL and state. Do not wait for CI or reviews, request reviewers,
respond to feedback, or mark a draft ready unless the user also invoked a
workflow such as `babysit-pr` or `ship-feature-pr` that owns those actions.
