---
name: write-pr-copy
description: >-
  Draft or revise a pull request title or description. Use when the user asks
  for PR copy, when another skill needs title and body text, or when existing PR
  copy needs rewriting. Do not create, update, or publish the pull request.
---

# Write PR Copy

Produce accurate PR-ready copy without mutating Git or GitHub.

## Understand the Change

Use the user request, existing PR copy, repository instructions, and the full
branch diff against its actual base. Inspect the branch's commits as supporting
context, but describe the branch as one coherent change rather than a commit
log.

Resolve the live remote default branch when the base is not supplied. Refresh
the relevant remote ref before trusting a branch comparison. If the correct base
materially changes the story and cannot be established, ask instead of guessing.

Look for the repository's pull request templates. Preserve meaningful headings
and checklists, fill them with concrete information, and omit unused generic
placeholders. Template discovery details do not belong in the resulting copy.

## Write the Title and Description

Keep the title to one clear line and follow repository style, including
conventional commits when established. Prefer wording that reads well in a
changelog for user-facing work; for internal work, name the durable project
outcome.

Keep the description simple. Start with a clear, minimal account of the problem
or reason for the change, usually grounded in the user's original request, then
explain how it was solved and any important tradeoffs. Do not force a stock
heading for the opening context; follow the repository's template when one
exists.

- Cover the full branch scope without listing every file or commit.
- Include a Testing section only when actual validation gives reviewers useful
  context or the template requires it. Never invent commands or results.
- Keep Testing distinct from Manual QA. Include manual steps only when they are
  concrete reviewer or user workflows, not generic CI instructions.
- Omit machine-local paths, usernames, home directories, host details, template
  status, and internal workflow telemetry.
- State meaningful limitations or residual risk plainly.

If the user asks only for a title, return only the title. If they ask only for a
description, return only the description.

## Add Provenance

When the agent authors or materially rewrites the description, append this
footer after the template content:

```md
---
_Written on behalf of jimeh by `<model-slug>` using `<harness>`._
```

Use the actual model slug and harness supplied by the current runtime. Do not
infer them from repository configuration; if either is unavailable, ask before
returning copy intended for publication. Attribute the model that authored the
final prose, not every model involved in the underlying work. Do not duplicate
an existing footer. The footer describes authorship of the prose, not the code.

## Return Copy Only

Follow the user's requested output format. Otherwise return labeled `Title` and
`Description` fields. Do not push, create, or edit a pull request.
