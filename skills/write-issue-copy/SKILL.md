---
name: write-issue-copy
description: >-
  Draft or revise a GitHub issue title or description. Use when the user asks
  for issue or ticket copy, or when another skill needs publication-ready issue
  text. Do not create, update, or publish the issue.
---

# Write issue copy

Produce accurate issue-ready copy without mutating Git or GitHub. Treat the
issue as a durable brief for maintainers and future implementers, not as a
transcript of the investigation or filing process.

## Understand the issue

Use the user request, verified investigation findings, linked discussions or
issues, repository instructions, relevant source and documentation, and any
existing issue copy. Preserve exact technical, product, API, configuration, and
UI names.

Do not require a branch diff. An issue describes a problem, decision, or desired
outcome rather than a completed change. Treat existing copy as potentially stale
and reconcile it against current evidence. Keep observed behavior, inference,
proposed work, and unresolved questions distinct.

Find and read the applicable issue template and chooser configuration. In
composed use, consume the live template context supplied by the caller. In
standalone use, inspect templates through read-only repository and GitHub state.
Preserve useful prompts, headings, title prefixes, and checklists. If multiple
templates plausibly apply and the evidence does not select one, ask which to
use. Flag when the intended publication conflicts with a repository's
contact-link routing or disabled blank-issue policy.

## Write the title and description

Keep the title to one clear line and follow established repository issue style.
Name the user-visible problem or durable outcome rather than an implementation
guess.

Use only the structure that helps this issue:

- For a bug, capture observed and expected behavior, reproduction details, and
  verified environment or diagnostic evidence when relevant.
- For an implementation task, explain why it matters, the intended result,
  important constraints, and observable acceptance criteria.
- For research or design work, state the question, known constraints, and the
  decision or artifact that will complete the issue.

Make the brief self-contained enough for someone unfamiliar with the original
conversation. Include repository-relative source pointers when they materially
reduce rediscovery. Do not prescribe an implementation that has not been
settled, silently split one request into several issues, or combine independent
outcomes into one issue.

Report commands and results only when they were actually observed and add useful
evidence. Omit credentials, private data, machine-local paths, usernames, host
details, agent orchestration, review routing, token usage, and other internal
workflow telemetry. State meaningful unknowns and limitations plainly.

If the user asks only for a title, return only the title. If they ask only for a
description, return only the description.

## Add provenance

When the agent authors or materially rewrites the description, append this
footer after the template content:

```md
---
_Written on behalf of jimeh by `<model-slug>` using `<harness>`._
```

Use the actual model slug and harness supplied by the current runtime. Do not
infer them from repository configuration. If either is unavailable, ask before
returning copy intended for publication. Attribute the model that authored the
final prose, not every model involved in the underlying investigation. Do not
duplicate an existing footer. The footer describes authorship of the prose.

## Check fidelity

Before returning the copy, verify that it:

- preserves the user's intent, qualifications, and exact technical names;
- distinguishes verified evidence from proposed work and open questions;
- satisfies the applicable template without inventing required answers;
- includes observable acceptance criteria when they help define completion;
- uses the supplied runtime identity when provenance is required; and
- contains no stale, sensitive, machine-local, or process-only details.

## Return copy only

Follow the user's requested output format. Otherwise return labeled `Title` and
`Description` fields. Do not create or edit a GitHub issue.
