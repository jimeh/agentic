---
name: eli5
description: >-
  Explain an unfamiliar concept to a true beginner through a visual,
  self-contained HTML artifact with large illustrations and sparse text. Use
  when the user asks for ELI5, "explain like I'm five," or a beginner-first
  visual explanation. Do not use for ordinary summaries, expert simplification,
  or product UI prototypes.
---

# ELI5

Give a beginner the smallest accurate mental model that makes the topic click.
"Five" describes assumed knowledge, not the reader's age. Write respectfully for
an adult unless the user names a different audience.

Apply `html-communication` for page construction, browser inspection, and
artifact delivery. This skill owns what to teach and how to sequence it. Honor
an explicitly requested output format instead of forcing HTML.

## Ground the explanation

Ground the explanation in the actual subject before simplifying it. When the
topic depends on a codebase, decision, incident, or current facts, inspect the
relevant code, records, or sources. Do not substitute a plausible generic
account for available evidence.

## Find the teaching spine

- Identify the question the explanation must answer and the one idea the reader
  should remember.
- Assume no subject knowledge beyond everyday experience. Introduce each
  unavoidable term at the moment it becomes useful.
- Begin with a concrete situation, object, or action the reader already knows.
  Map it to the real mechanism instead of letting the analogy replace the
  explanation.
- State where an analogy stops matching reality when that mismatch could create
  the wrong mental model.
- Use the fewest scenes that make the causal story clear. Let each scene answer
  one question or show one change.
- Keep caveats that change the conclusion, a safety decision, or an important
  boundary. Simplicity must not make a claim more certain than the evidence.

## Make the pictures do the work

- Use large diagrams, illustrations, spatial relationships, or restrained
  animation as the main explanation. Prefer self-contained HTML, CSS, and inline
  SVG when they can express the idea clearly.
- Give every visual a teaching job. Remove decorative charts, stock imagery, and
  icons that repeat the words beside them.
- Keep visible prose sparse. Use one main sentence or question per scene and
  short labels on the visual. Put useful optional detail behind a clear reveal
  rather than shrinking it into dense text.
- Show change directly. Movement, before-and-after states, or a small
  interaction should expose cause and effect, not merely decorate the page.
- Pair the familiar model with the real name or mechanism before the end. The
  reader should leave with language they can use to learn more.
- Make the sequence understandable without relying on color, animation, or
  interaction alone. Add meaningful text alternatives for informative visuals.

## Check the explanation

Render and inspect the finished artifact. Confirm that a zero-context reader can
answer these questions from the main path:

- What is this?
- What happens, in what order?
- Why does it matter?
- Which part was an analogy, and what is the real mechanism called?

Remove any scene, sentence, label, or interaction that does not improve one of
those answers. Hand over the artifact with its path or requested link and a
one-sentence statement of what the explanation teaches.
