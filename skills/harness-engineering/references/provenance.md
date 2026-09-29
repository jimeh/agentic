# Provenance

The agent-authoring guidance adapts the context-routing, progressive-disclosure,
co-location, and pruning principles from Matt Pocock's pinned
[`writing-for-agents`](https://github.com/mattpocock/skills/blob/885e2ca4d842d139e9aef4e48d366c63cb1b8013/skills/productivity/writing-for-agents/SKILL.md)
skill. Its safety, authority, evidence, and environment-source rules are adapted
for this repository's agent workflows.

The evidence-led audit, runtime ownership, artifact lifetime, incremental
enforcement, measurement, and automated-review guidance also draws on T3 Code at
commit
[`d29c56a5c404cb0f58d3b2ac41762fa0d0ac28d4`](https://github.com/pingdotgg/t3code/tree/d29c56a5c404cb0f58d3b2ac41762fa0d0ac28d4).
Relevant examples include its
[runtime testing skill](https://github.com/pingdotgg/t3code/blob/d29c56a5c404cb0f58d3b2ac41762fa0d0ac28d4/.agents/skills/test-t3-app/SKILL.md),
[dev-runner failure audit](https://github.com/pingdotgg/t3code/pull/5586),
[transfer budgets](https://github.com/pingdotgg/t3code/pull/5350),
[lint allowance audit](https://github.com/pingdotgg/t3code/pull/9300),
[reviewer narrowing](https://github.com/pingdotgg/t3code/pull/9297), and
[stale-plan removal](https://github.com/pingdotgg/t3code/pull/7665).

These mechanisms are adapted to project scope and observed failure cost. The
guidance does not assume that occurrence ceilings identify individual
violations, prohibit bounded condition polling, or restrict correctness review
to reading changed lines. The public evidence does not establish a causal
improvement in contribution quality.
