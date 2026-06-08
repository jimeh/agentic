# Guides and Sensors

Use this model to decide whether a harness improvement should steer agents
before action or validate their work after action.

## Core Terms

- **Guide**: feed-forward context that helps the agent choose the right path
  before it acts.
- **Sensor**: feedback that observes an output and helps the agent self-correct.
- **Computational**: deterministic and mechanically checkable.
- **Inferential**: interpreted by an LLM or human judgment.

## Control Matrix

|               | Guide                                           | Sensor                                                 |
| ------------- | ----------------------------------------------- | ------------------------------------------------------ |
| Inferential   | `AGENTS.md`, skills, docs, examples, principles | review agents, QA notes, design critique               |
| Computational | generators, codemods, templates, typed helpers  | tests, type checks, linters, logs, CI, workflow checks |

For correctness, security, architecture, and release safety, prefer
computational sensors. For taste, domain vocabulary, tradeoffs, and navigation,
use inferential guides.

## Choosing the Control

Use a guide when:

- the agent needs domain vocabulary or business context
- multiple valid implementations exist
- the rule needs judgment or tradeoff awareness
- the information is stable enough to load into context

Use a sensor when:

- the desired behavior can be checked mechanically
- a recurring review comment has an objective fix
- failures should stop before human review
- the agent can run the check during normal work

Use both when a rule is important and non-obvious: document the intent briefly,
then enforce the objective part with a test, lint, script, or CI check.

## Docs vs Skills

Use docs for reference knowledge:

- architecture overviews
- domain glossaries
- testing conventions
- quality trackers
- command maps

Use project-local skills for agent workflows:

- repeatable procedures with multiple steps
- branching logic based on project area or change type
- workflows that need references or scripts loaded only on demand
- release, migration, benchmark, incident, or PR-feedback processes
- guides that agents repeatedly need to execute, not just read

Do not convert a doc into a skill just because it is long. Convert it when
triggerability, progressive loading, or workflow reliability improves.

## Sensor Quality

Good sensors are:

- fast enough for the expected loop
- runnable locally or clearly mapped from CI
- specific about what failed
- clear about remediation
- scoped to the change when possible

Poor sensors are:

- slow by default for small edits
- noisy or flaky without a policy
- hard to reproduce locally
- written only for humans, with no actionable fix hint

## Harness Evolution

Treat harness controls as assumptions that can expire. When models, tooling, or
project structure improve, prune controls that no longer add signal. A stale
guide or expensive sensor can be worse than no control because it consumes
context, time, and trust.
