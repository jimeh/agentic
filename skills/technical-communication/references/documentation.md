# Documentation

Documentation helps a reader understand or use the current system. Preserve the
project's established documentation architecture, terminology, formatting, and
source-of-truth hierarchy.

## Choose the Document's Job

Identify the primary content type before organizing it:

- **Concept:** explains what something is, why it exists, and how it relates to
  the surrounding system.
- **Task or tutorial:** helps the reader achieve a concrete outcome.
- **Reference:** provides precise, complete facts about an interface or surface.
- **Troubleshooting:** connects symptoms and evidence to diagnosis, correction,
  and verification.

Mix types only when that helps the reader. Keep a task's conceptual introduction
short, and do not bury a procedure inside an essay.

## Build From Verified Behavior

- Inspect the implementation, public contracts, commands, UI, and existing docs
  relevant to the claim. Do not document an assumption as current behavior.
- Preserve meaningful existing content and links. Correct stale claims when the
  requested scope authorizes it.
- Clearly label proposals, previews, unreleased behavior, version-specific
  details, and time-sensitive information. Prefer durable descriptions of the
  current system over words such as "new," "now," or "currently."
- Use exact dates, versions, measurements, and sources when their precision
  affects the reader's decision.

## Structure for Scanning

- Give the page a clear purpose and put critical information first.
- Follow the project's established heading capitalization. When none exists, use
  descriptive sentence-case headings. Start task headings with a direct verb;
  use noun phrases for conceptual or reference sections when natural.
- Keep paragraphs focused on one idea. Introduce lists, tables, examples, code,
  and diagrams with the context needed to interpret them.
- Use numbered lists for sequences, bullets for unordered sets, and tables for
  repeated fields or multi-property comparisons. Keep list items parallel.
- Provide essential context in place. Link selectively to the most relevant
  destination with descriptive text rather than making readers follow a link for
  a short definition or prerequisite.

## Write Usable Procedures

- State prerequisites, permissions, environment, and other preparation before
  the reader starts.
- Prefer the shortest accessible path that serves the intended audience. If
  multiple paths matter, separate them and explain the selection criterion.
- Put the location, condition, or goal before the action when that helps the
  reader orient or skip an inapplicable step.
- Start each material step with the action. Keep one reader decision per step
  and split long or branching steps.
- Explain placeholders near the command or example that uses them.
- State expected results, output, or verification when readers need them to know
  whether they can continue.
- Mark optional actions unambiguously. Do not make a required step sound
  optional merely because it begins with a purpose clause.

## Use Examples That Work

- Make examples representative of the documented path and valid under the
  project's current syntax and style.
- Never invent commands, outputs, performance results, or validation claims.
- Use reserved or clearly fictional domains, addresses, names, identifiers, and
  other example data. Avoid real personally identifiable information.
- Explain omissions and placeholders. Do not let a simplified example imply
  production guarantees it does not provide.
- Prefer text and code over screenshots when the exact text matters. For useful
  images, provide meaningful alternative text and do not rely on visual
  position, color, or shape alone.

Before finishing, verify that the intended reader can find the relevant path,
complete it without hidden prerequisites, and distinguish current documented
behavior from proposals or examples.
