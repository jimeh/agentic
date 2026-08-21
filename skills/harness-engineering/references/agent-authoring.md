# Agent Authoring

Use this reference when authoring or revising guidance that an agent consumes:
project instructions, repository rules, linked agent docs, and repository-owned
or project-local skills. Do not load it merely because ordinary product or
developer documentation is being edited.

Use the environment's skill-authoring workflow for skill packaging, metadata,
and platform-specific validation. This reference covers the behavioral design:
what should trigger the guidance, what context it should reveal, and how to
check that it changes agent behavior as intended.

## Start From Intended Behavior

Describe the behavior before writing instructions:

- Name the user intents and repository situations that should activate the
  guidance.
- Separate materially different branches, such as diagnosis-only work and
  diagnosis followed by an authorized fix.
- Name likely non-triggers when they prevent a plausible misroute. Do not pad
  routing text with exhaustive synonym or exclusion lists.
- State the outcome, decision criteria, authority boundary, and evidence needed
  for completion.

Descriptions and entry-point pointers should say both what the guidance does and
when it applies. Keep routing discriminating: one clear condition for each
meaningfully different branch is more useful than a broad category label.

## Control Context Load

Put information where the agent needs it:

- Keep shared, critical constraints and the main workflow in the entry point.
- Move substantial branch-specific detail into a reference, then point to it
  from the exact condition that requires it.
- State what a linked reference contributes so the agent can decide whether to
  load it.
- Co-locate a concept's definition, operating rules, and important caveats.
- Keep must-read safety and authorization rules inline. Do not hide them behind
  conditional disclosure.

Progressive disclosure is useful when it saves irrelevant context without making
required context hard to discover. A short file split across vague pointers is
usually worse than a single coherent source.

When revising a skill, read `references/provenance.md` if it exists. Keep pinned
upstream links, adaptation history, and maintenance attribution there rather
than in runtime instructions. Ordinary skill use should not load provenance.

## Keep Sources Authoritative

Treat the repository and execution environment as live sources of truth. Point
agents at discoverable commands, configuration, schemas, and tool help instead
of copying details that are cheap to inspect and likely to drift.

Record the knowledge that inspection alone does not explain: why a constraint
exists, when a branch applies, what evidence is sufficient, and which tempting
action is unsafe. Give each durable rule one authoritative home and link to it
from other entry points rather than maintaining parallel copies.

## Write Instructions That Earn Their Context

Each instruction should materially change a decision or action. Prefer:

- concrete outcomes over abstract aspirations
- observable completion criteria over claims of care or thoroughness
- proportionate evidence over universal checklists
- established project terms when they reduce repeated explanation
- positive target behavior when it is equally precise

Keep explicit prohibitions when they protect safety, authority, data, or other
hard boundaries. Rewriting "do not access production" as a positive preference
weakens the contract.

Prune guidance that merely restates default agent behavior, duplicates another
source, no longer matches the repository, or accumulated from an isolated
incident without a recurring failure mode. Revisit guidance when observed
failures show it is too weak, too broad, or no longer useful.

## Scenario-Check the Result

Before calling agent guidance complete, exercise a small set of representative
prompts or tasks:

1. A common case that should follow the primary path.
2. A branch or boundary case that needs different context or authority.
3. For conditional guidance, a plausible non-trigger that should not load or
   follow it. For always-loaded guidance, an unrelated case whose handling it
   should not distract from or change.
4. A safety-sensitive case where a prohibition must remain explicit.

For each scenario, check whether the agent:

- routes to the intended guidance and avoids unrelated guidance
- discovers the required source without loading every reference
- preserves the user's authority and the repository's safety boundaries
- can tell what completion and acceptable evidence look like
- relies on current environment facts instead of stale duplicated details

Use a fresh evaluator or isolated agent run when the behavioral risk justifies
it and the workflow authorizes one. Give it the guidance, linked sources, and
scenario without the author's conclusions. Otherwise perform a manual scenario
review using only evidence the guidance makes discoverable, and record that it
is weaker evidence. Keep the check proportionate; a compact wording change does
not require a new evaluation framework.
