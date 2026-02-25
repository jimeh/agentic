# phased-work

A Claude Code plugin that enforces a disciplined research-plan-implement
workflow. Instead of jumping straight to code, you move through distinct phases
— each with its own slash command — so that every decision is made and reviewed
before implementation begins.

Inspired by Boris Tane's
[How I Use Claude Code](https://boristane.com/blog/how-i-use-claude-code/).

## Why This Workflow

The biggest risk with AI coding agents isn't bad syntax — it's implementations
built on wrong assumptions. Deep research forces the agent to genuinely
understand the codebase before proposing anything. The plan-review-refine cycle
that follows is where _you_ add the most value: you annotate the plan with
corrections, constraints, and domain knowledge the agent doesn't have, then send
it back to revise — repeating until every decision is right. By the time
implementation starts, it's mechanical.

Because research and plans live in files on disk (`research.md`, `plan.md`),
they also survive context compaction. If the agent's context window fills up
mid-session, the full plan can be re-read at any point. You always have a
reviewable, editable specification — not a chat history you'd have to scroll
through to reconstruct decisions.

## Workflow

```
/research → /plan → /refine (repeat) → /todo → /implement [→ /review]
```

### `/research <area>`

Deep-read a codebase area and write structured findings to `research.md`. The
agent reads deeply — tracing data flows, checking tests, using git history — and
produces a review surface you can verify before planning.

### `/plan <feature or change>`

Create a detailed implementation plan in `plan.md`. Includes code snippets, file
paths, and trade-offs. If `research.md` exists, it's used as context.

### `/refine [guidance]`

Address inline notes you've added to `plan.md` (or `research.md`). Open the
document in your editor, add corrections or directions as inline notes, then run
`/refine`. Repeat 1-6 times until the plan is right. The agent will not
implement anything during this phase.

### `/todo [filename]`

Add a granular task breakdown with checkboxes to the plan document. Review and
refine the todo list before starting implementation.

### `/implement [constraints]`

Execute everything in the plan, marking tasks as completed. The agent follows
the plan mechanically, runs type checkers and relevant tests, and doesn't stop
until all tasks are done.

### `/review [focus]`

Optional post-implementation sanity check. Compares what was built against the
plan, flags concerns about the final code state, and recommends next steps.
Writes findings to `review.md`.

## Example Session

```
you:   /research the notification system
       → agent writes research.md

you:   [review research.md]

you:   /plan add email digest support for notifications
       → agent writes plan.md

you:   [add inline notes to plan.md in your editor]

you:   /refine
       → agent addresses all notes, updates plan.md

you:   [add more notes if needed, /refine again]

you:   /todo
       → agent adds task breakdown to plan.md

you:   /implement
       → agent executes the full plan

you:   /review
       → agent writes review.md with findings and next steps
```

## Snippets

Not using Claude Code? See [snippets.md](snippets.md) for agent-agnostic prompt
snippets you can paste into any AI coding assistant. Works well with text
expansion apps (Raycast, TextExpander, Alfred, Espanso, etc.) — set up a short
trigger for each phase and append your context at the end.

## Install

```bash
# Add the marketplace (once)
claude plugin marketplace add jimeh/agentic

# Install the plugin
claude plugin install phased-work@jimeh-agentic
```

Or from within Claude Code:

```text
/plugin marketplace add jimeh/agentic
/plugin install phased-work@jimeh-agentic
```
