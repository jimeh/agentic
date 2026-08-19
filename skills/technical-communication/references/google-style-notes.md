# Google Developer Style Notes

Last reviewed: 2026-08-19.

This is an original, attributed synthesis of Google's
[developer documentation style guide](https://developers.google.com/style), not
a vendored copy. The source guide is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). These notes preserve
the rationale for this skill; ordinary writing tasks should use the skill's
task-focused guidance instead.

For a categorized inventory of the complete live guide, read
[google-style-index.md](google-style-index.md). Load that index only when
maintaining this distillation, answering a specialized Google-style question, or
checking an artifact for explicit Google Style Guide compliance.

## Reference Hierarchy

Google treats its guide as guidance rather than universal rules. It recommends
project-specific style first, its guide second, and other editorial references
last. It explicitly permits departures that improve the content for a domain and
its readers, provided the result remains consistent.

This skill adapts that hierarchy as follows:

1. Follow the user's intent, project contracts, terminology, and established
   artifact conventions.
2. Apply the skill's reader-focused principles where project guidance leaves a
   decision open.
3. Use external style references to resolve remaining language questions.

## Principles Adopted

### Reader, Voice, and Precision

- Write for a known audience in a conversational, respectful, direct voice.
- Prefer active voice, second person for reader actions, present tense for
  current behavior, and explicit actors where responsibility could be unclear.
- Use simple words, short sentences, consistent terminology, and definitions for
  necessary jargon.
- Make pronoun antecedents unambiguous.
- Avoid anthropomorphism when it makes system behavior less precise.

Sources: [voice and tone](https://developers.google.com/style/tone),
[active voice](https://developers.google.com/style/voice),
[second person](https://developers.google.com/style/person),
[pronouns](https://developers.google.com/style/pronouns),
[global audience](https://developers.google.com/style/translation),
[jargon](https://developers.google.com/style/jargon), and
[anthropomorphism](https://developers.google.com/style/anthropomorphism).

### Information Order and Structure

- Put critical information first and keep paragraphs focused on one idea.
- Put a relevant condition, context, or goal before the instruction it
  qualifies.
- Use descriptive sentence-case headings, parallel lists, and numbered steps
  only for sequences.
- Choose the structure that matches the content rather than forcing a visual
  pattern or template.

Sources:
[paragraph structure](https://developers.google.com/style/paragraph-structure),
[sentence structure](https://developers.google.com/style/sentence-structure),
[headings](https://developers.google.com/style/headings),
[lists](https://developers.google.com/style/lists), and
[procedures](https://developers.google.com/style/procedures).

### Prescriptive and Evidence-Based Writing

- Recommend a useful path instead of presenting equivalent-looking options.
- Distinguish required, recommended, optional, expected, and possible behavior.
- Avoid unsupported superlatives, guarantees, comparative claims, and security
  promises.
- Prefer durable descriptions of current behavior. Do not present planned or
  unreleased behavior as current documentation.

Sources:
[prescriptive documentation](https://developers.google.com/style/prescriptive-documentation),
[excessive claims](https://developers.google.com/style/excessive-claims),
[timeless documentation](https://developers.google.com/style/timeless-documentation),
[future features](https://developers.google.com/style/future), and
[present tense](https://developers.google.com/style/tense).

### Accessibility, Inclusion, and Global Use

- Make headings, links, lists, tables, images, and interactive instructions
  navigable without relying only on visual position or styling.
- Use descriptive link text and useful alternative text.
- Avoid idioms, cultural shorthand, unnecessary gendering, ableist or violent
  metaphors, and examples that reinforce stereotypes.
- Use reserved, fictional data instead of real personally identifiable
  information.

Sources:
[accessible documentation](https://developers.google.com/style/accessibility),
[inclusive documentation](https://developers.google.com/style/inclusive-documentation),
[global audience](https://developers.google.com/style/translation),
[cross-references](https://developers.google.com/style/cross-references), and
[example domains and names](https://developers.google.com/style/examples).

### Technical Examples and Sources

- Follow project-specific code and command conventions before a general writing
  guide.
- Preserve exact code, command, filename, API, product, configuration, and UI
  names while editing surrounding prose.
- Describe UI tasks by goal and accessible label rather than by visual position.
- Give informative images useful alternative text and mark decorative images so
  assistive technology can ignore them.
- Introduce code and commands with their purpose, explain placeholders, and show
  output only when it helps the reader verify or interpret the action.
- Paraphrase third-party material and link to the source rather than copying it.

Sources: [code samples](https://developers.google.com/style/code-samples),
[command-line syntax](https://developers.google.com/style/code-syntax),
[code in text](https://developers.google.com/style/code-in-text),
[placeholders](https://developers.google.com/style/placeholders),
[UI elements and interaction](https://developers.google.com/style/ui-elements),
[figures and other images](https://developers.google.com/style/images), and
[third-party content](https://developers.google.com/style/other-sources).

## Deliberate Adaptations and Omissions

- Do not impose Google's product naming, trademark, phone-number, punctuation,
  HTML, or file-naming house style on unrelated projects.
- Do not enforce US English when the user, audience, or project uses another
  dialect.
- Do not import Google's code indentation, line-length, or Markdown conventions;
  project tooling owns those decisions.
- Do not ban `should` globally. Avoid it only when required versus optional
  behavior would otherwise be ambiguous.
- Do not ban keyboard shortcuts, first-person language, contractions, or
  figurative language mechanically. Retain them when the audience, artifact, and
  project voice make them clear and appropriate.
- Prefer Markdown for ordinary linear communication in this repository. Use a
  more expressive format only when it materially improves comprehension.

The operational distinction between drafting, revising, and auditing; the
protected-content pass for revisions; and the stopping rule were also informed
by
[`nbj-write-clearly` at commit `56e3a27`](https://github.com/daniel-p-green/nbj-write-clearly/commit/56e3a27f920bcd772f7b03fa476b5cfb9268332c).
Those safeguards are comparative design adaptations, not rules attributed to
Google.
