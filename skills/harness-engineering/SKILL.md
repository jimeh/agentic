---
name: harness-engineering
description: >-
  Audit or improve repository instructions, agent workflows, and feedback tools
  when the user requests agent-setup or harness work.
---

# Harness engineering

Inspect actual instructions, commands, and observed failures before proposing
changes. Preserve user scope: audits and discussions remain read-only;
authorized improvements proceed through proportionate verification.

Choose only the guidance the task needs:

- For a broad repository audit or tooling improvement, read
  [harness workflow](references/harness-workflow.md). It covers evidence
  gathering, validation ownership, hooks, and prioritization. Use the
  [checklist](references/harness-checklist.md) for applicable baseline checks.
- For agent instructions, use
  [project instructions](references/project-instructions.md) to choose what
  belongs in root guidance and [agent authoring](references/agent-authoring.md)
  for routing and scenario checks. Read
  [knowledge placement](references/repo-knowledge-map.md) only when
  restructuring documentation.
- For skills and global rules, use
  [agent authoring](references/agent-authoring.md). Skill packaging and platform
  metadata belong to the environment's skill-authoring workflow.
- For task or hook changes, consult
  [tooling patterns](references/tooling-patterns.md) and
  [hook placement](references/tooling-hooks-dependencies.md) only as needed.
- For runtime isolation or stateful verification, use
  [runtime ownership](references/runtime-ownership.md). For measurement and
  validation design, use [feedback loops](references/feedback-loops.md).
- For adopting checks in existing code, use
  [enforceable invariants](references/enforceable-invariants.md). For automated
  review design, use
  [review controls](references/guides-and-sensors.md#automated-review).
- For stale instructions, plans, or examples, use
  [artifact lifetime](references/repo-knowledge-map.md#artifact-lifetime) and
  [cleanup](references/entropy-cleanup.md).

Keep useful constraints close to the decision they govern. Prefer focused tasks,
checks, and conditional guidance over growing mandatory reading lists. Preserve
valid evidence instead of rerunning checks at each workflow handoff. Verify
routing with realistic triggers and non-triggers; metadata checks alone do not
prove behavior. Report observed findings, proposed changes, verification, and
remaining uncertainty.
