---
name: write-pr-copy
description: >-
  Draft or revise a pull request title or description. Use when the user asks
  for PR copy, when another skill needs title and body text, or when existing PR
  copy needs rewriting. Do not create, update, or publish the pull request.
---

# Write PR Copy

Produce accurate PR-ready copy without mutating Git or GitHub. Treat the title
and description as durable context for current reviewers and future maintainers,
not as a transcript of the delivery process.

## Understand the Change

Use the user request or linked issue, existing PR copy, repository instructions,
and the full merge-base or three-dot-equivalent diff between the actual base and
head. Inspect the branch's commits as supporting context, but describe the
branch as one coherent change rather than a commit log.

Work only from current immutable base and head identities supplied by the caller
or, in standalone use, established from current read-only PR metadata. Verify
that both resolve to the commits used for the comparison and match current
read-only PR metadata when it is available. A local remote-tracking ref alone
does not prove that either identity is current. If either identity remains
materially uncertain, ask the caller or user to refresh or supply it instead of
guessing. The caller owns ref refreshes and all Git or GitHub mutation.

Treat existing PR copy as potentially stale. Reconcile its issue intent,
qualifications and modality, scope, validation, rollout claims, tradeoffs, risk,
and limitations against the current base and head. Preserve exact technical,
product, API, configuration, and UI names.

Look for the repository's pull request templates. Preserve meaningful headings
and checklists, fill them with concrete information, and omit unused generic
placeholders. Template discovery details do not belong in the resulting copy.

## Write the Title and Description

Keep the title to one clear line and follow repository style, including
conventional commits when established. Prefer wording that reads well in a
changelog for user-facing work; for internal work, name the durable project
outcome.

Keep the description simple. Start with a clear, minimal account of why the
change exists. Give reviewers enough durable context to understand its material
effect, important tradeoffs or review focus, how confidence was established, and
any residual risk. Use only the headings that help this change or that the
repository template requires.

- Cover the full branch scope without listing every file or commit.
- Include a Testing section only when actual validation gives reviewers useful
  context or the template requires it. Name a portable repository command only
  when it is the command that actually ran. Otherwise report a concise observed
  result without substituting a different command. Never invent commands or
  results, and omit local helper paths.
- Keep Testing distinct from Manual QA. Include manual steps only when they are
  concrete reviewer or user workflows, not generic CI instructions.
- Omit machine-local paths, usernames, home directories, host details, template
  status, agent orchestration, review routing, token usage, and other internal
  workflow telemetry.
- Mention CI or review state only when the template requires it or it materially
  helps the reviewer, and only when the state was verified current for the head.
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

## Check Fidelity and Currency

Before returning the copy, verify that it:

- matches the full comparison between the verified immutable base and head;
- preserves the issue's intent, qualifications, and exact technical names;
- makes only evidence-backed validation, rollout, CI, and review claims;
- gives reviewers the material tradeoffs, limitations, and residual risk;
- uses the supplied runtime identity in the provenance footer, or asks when that
  identity is unavailable; and
- contains no stale, machine-local, or process-only details.

## Return Copy Only

Follow the user's requested output format. Otherwise return labeled `Title` and
`Description` fields. Do not push, create, or edit a pull request.
