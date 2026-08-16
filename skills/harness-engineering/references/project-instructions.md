# Project Instructions

Use this when creating, auditing, or refining a repository's `AGENTS.md` or
equivalent project instructions.

## Contents

- [Goal](#goal)
- [Discover Instructions from Evidence](#discover-instructions-from-evidence)
- [Build a Candidate Ledger](#build-a-candidate-ledger)
- [Ask Targeted Questions](#ask-targeted-questions)
- [Choose the Content](#choose-the-content)
- [Place and Prune Guidance](#place-and-prune-guidance)
- [Scenario-Check the Draft](#scenario-check-the-draft)
- [Keep Instructions Current](#keep-instructions-current)

## Goal

Write project instructions for agents changing the repository, not an
alternative README. Give a fresh agent the compact context needed to choose the
right implementation path, avoid known hazards, and prove the result without
repeating general project documentation.

Derive instructions from this repository's actual work. Do not copy a generic
`AGENTS.md` template or another project's rules. Treat the sections below as a
component palette rather than a required outline.

## Discover Instructions from Evidence

Inspect the repository before interviewing the user. Prefer evidence in this
order:

1. Existing project instructions and their Git history.
2. Canonical commands, architecture and product docs, schemas, package
   boundaries, runtime entry points, and generated sources.
3. Accepted review findings, recurring CI failures, corrective follow-up
   commits, and repeated handoff notes.
4. Agent-session transcripts, user corrections, abandoned approaches, command
   failures, and task timing when the user has made them available or authorized
   their inspection.
5. Maintainer explanations for consequential facts that the repository cannot
   establish.

Look beyond correctness defects. Capture repeated cases of:

- incomplete changes across clients, adapters, entry points, state transitions,
  contracts, or documentation audiences
- exact command syntax or tool behavior that agents routinely guess wrong
- damage to active development state, user data, processes, credentials, or
  environment-owned files
- unnecessary builds, broad checks, tool calls, abstractions, or security
  machinery
- terminology mismatches that make agent output harder for maintainers to use
- stale instructions that caused an otherwise reasonable decision

When a task took much longer than expected, distinguish unavoidable complexity
from navigation, setup, validation, or tool-call waste. When a model chose a bad
path, trace the context that made the choice appear reasonable before writing a
new rule.

## Build a Candidate Ledger

Record candidate guidance before drafting prose. Use a compact table when the
set is non-trivial:

| Candidate                     | Evidence                             | Frequency or cost  | Stability | Best artifact                |
| ----------------------------- | ------------------------------------ | ------------------ | --------- | ---------------------------- |
| Check every client surface    | Three accepted fixes missed mobile   | frequent, high     | stable    | root `AGENTS.md`             |
| Use the canonical schema task | CI failures from hand-written output | occasional, medium | stable    | task plus short root pointer |

Rank candidates by observed frequency, failure cost, and feedback delay. Mark
inferences as such. Do not turn a single annoyance into a permanent rule unless
its potential cost is independently high.

Choose the lightest durable artifact:

- Keep judgment, vocabulary, tradeoffs, and navigation in guidance.
- Move conditional multi-step procedures into project-local skills.
- Move detailed background into linked docs.
- Encode objectively checkable rules in tests, lints, scripts, types, or CI.
- Pair a short explanation with enforcement when the intent is not obvious.

## Ask Targeted Questions

Ask only when inspection leaves a consequential gap whose answer would
materially change the instructions. Do not ask the user to repeat commands,
architecture, or conventions that the repository can establish.

Lead with the evidence and a proposed interpretation. Ask one to three
high-leverage questions at a time, selected from gaps such as:

- Which product or engineering qualities must changes never compromise?
- Which recurring agent mistakes or unnecessary work cost the team most?
- Which clients, providers, contracts, entry points, inverse operations, or
  documentation surfaces must be considered together?
- Which project terms, actors, or states should agents use precisely?
- Which commands or runtime actions can damage an active development
  environment?
- Which apparent best practices cause unwanted complexity in this repository?

If no answer is required to proceed safely, state the material assumption and
continue. Do not make a generic questionnaire a prerequisite for ordinary
harness work.

## Choose the Content

Select only components that influence repeated decisions:

- **Change-oriented project model**: explain what the system is, who or what its
  important actors are, and the execution model agents otherwise rediscover.
- **Non-negotiables and tradeoffs**: name qualities such as compatibility,
  performance, openness, portability, or simplicity when they constrain valid
  solutions. Explain the project-specific consequence, not a slogan alone.
- **Glossary**: define overloaded domain terms, actors, surfaces, and lifecycle
  states when consistent language improves implementation or communication.
- **Change-impact dimensions**: list cross-cutting surfaces that need an
  explicit decision, such as clients, adapters, contracts, persistence, entry
  points, reverse transitions, and user-facing versus maintainer docs.
- **Operational hazards**: identify active services, isolated development state,
  test data, credentials, process ownership, shutdown behavior, and exact
  command sharp edges.
- **Task and validation surface**: name canonical setup, targeted iteration,
  handoff, and broad verification commands, including when each is appropriate.
- **Architecture and navigation**: describe stable boundaries and
  source-of-truth locations rather than exhaustive directory inventories.
- **Override semantics**: present judgment-based guidance as defaults that yield
  to explicit task or maintainer direction unless it represents a hard safety
  boundary.

Keep enough project context in the root file to shape every change. Link
conditional detail rather than forcing every agent to load it.

## Place and Prune Guidance

Keep a rule in the root `AGENTS.md` when it is stable, concise, broadly
applicable, and costly to miss. Put sharply different subtree rules in a local
`AGENTS.md`. Put reference material in docs and procedures in skills.

Remove or relocate:

- README-style installation, marketing, or contributor introductions
- personal defaults that belong in global instructions
- rules already made obvious and unavoidable by tooling
- brittle file inventories or facts likely to change frequently
- generic quality advice without a repository-specific consequence
- one-off corrections with low recurrence and low cost
- duplicated guidance with no clear source of truth

Prefer a short concrete example when a rule is easy to misread. Do not preserve
an instruction merely because it already exists.

## Scenario-Check the Draft

Replay two or three representative changes before considering the instructions
done. Prefer a common change, a historically troublesome change, and a boundary
case. When isolated agent sessions are available and proportionate, give a fresh
evaluator the draft, its linked repository sources, and the scenario without the
author's conclusions. Otherwise replay the scenario manually while limiting the
evidence to what the draft makes discoverable, and record that weaker validation
boundary. For each scenario, verify that the evaluator can determine:

- which code and change-impact dimensions need consideration
- which source of truth or deeper doc to consult
- which commands and test data to use
- which environment or user-state hazards to avoid
- what evidence is sufficient for handoff

Also verify that unrelated guidance does not distract from the scenario. If a
past failure would still look reasonable after reading the draft, improve the
guide or add the missing sensor instead of declaring success.

## Keep Instructions Current

Treat project instructions as a maintained control, not a finished prompt.
Revisit them when repeated corrections, costly reviews, new product surfaces, or
stale facts appear. Ask why the existing harness allowed the failure, then
update the smallest appropriate guide, sensor, task, or enforcement point.

Remove guidance when repository structure, tooling, or model behavior makes it
obsolete. A shorter trusted file is more useful than an exhaustive stale one.
