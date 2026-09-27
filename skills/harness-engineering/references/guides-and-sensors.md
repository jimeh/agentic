# Guides and Sensors

Use this model to decide whether a harness improvement should steer agents
before action or validate their work after action.

## Contents

- [Core Terms](#core-terms)
- [Control Matrix](#control-matrix)
- [Choosing the Control](#choosing-the-control)
- [Docs vs Skills](#docs-vs-skills)
- [Sensor Quality](#sensor-quality)
- [Automated review](#automated-review)
- [Long-Running Workflows](#long-running-workflows)
- [Harness Evolution](#harness-evolution)

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
- maintained quality records, following the
  [artifact lifetime decision](repo-knowledge-map.md#artifact-lifetime)
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

## Automated review

Use model-based checks only when the repository needs judgment that reliable
mechanical checks do not supply. Define each reviewer's concern, trigger,
permitted investigation, finding criteria, cost limit, and result contract.
Avoid adding reviewers merely to complete an audit checklist.

A narrow convention check may inspect selected changed lines and paths. A
correctness or architecture review may need unchanged consumers, contracts, and
tests to establish a regression. Scope findings to problems introduced or
worsened by the change, while allowing the investigation needed to prove them.
Optional preferences should not block unless the repository makes them policy.

Run relevant deterministic prerequisites first when that saves wasted review.
Define separate outcomes for pass, findings, and inconclusive execution. Missing
context, a timeout, or an unavailable prerequisite is not a pass. Use stable
machine-readable output or an exact pass response when automation consumes it.
Preserve the repository's human approval rules for product decisions and policy
exceptions; the reviewer does not acquire that authority.

Before making a check blocking, evaluate known regressions and legitimate
changes, including an irrelevant diff and an incomplete run. Inspect missed
findings and false positives as well as successful detections. Periodically
revisit trigger frequency, cost, usefulness, and prompt size. Remove stale rules
and move reliably checkable ones into deterministic tooling.

## Long-Running Workflows

For long-running or high-risk work, consider a stronger workflow harness instead
of only adding more docs:

- a planner step that turns intent into a scoped plan or execution artifact
- an agreement on what "done" means before implementation starts
- a generator/implementer loop that works one coherent chunk at a time
- an evaluator or review step that validates the result against the plan
- handoff artifacts that preserve decisions, progress, evidence, and next steps

Use this when work spans many sessions, requires subjective judgment, or needs
independent verification. Keep it lightweight for normal changes; every workflow
component encodes an assumption about what the agent cannot yet do reliably.

## Harness Evolution

Treat harness controls as assumptions that can expire. When models, tooling, or
project structure improve, prune controls that no longer add signal. A stale
guide or expensive sensor can be worse than no control because it consumes
context, time, and trust.
