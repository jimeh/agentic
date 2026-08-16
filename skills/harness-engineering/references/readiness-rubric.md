# Harness Readiness Rubric

Use this rubric to audit a repository for agent-first development. Score each
area from 0 to 3, then prioritize low-effort improvements that unlock future
agent validation or reduce repeated failures.

## Contents

- [Levels](#levels)
- [Categories](#categories)
- [Output Shape](#output-shape)

## Levels

- **0 Missing**: agents depend on unstated human knowledge.
- **1 Discoverable**: agents can find instructions, but validation is manual or
  inconsistent.
- **2 Operational**: agents can run commands and follow structured docs for
  common tasks.
- **3 Compounding**: agents get mechanical feedback, enforce constraints, and
  improve the harness as part of normal work.

## Categories

### Project Map

- Root `AGENTS.md` or equivalent is short and accurate.
- It points to deeper docs instead of duplicating them.
- It explains non-obvious commands, package managers, and conventions.
- It avoids stale path catalogs in favor of stable patterns and grep hints.
- Detailed agent guidance lives in linked docs, not hidden instruction sprawl.
- Claude Code compatibility is handled with a root `CLAUDE.md` containing only
  `@AGENTS.md` when `AGENTS.md` is the source of truth.

### Repository Knowledge

- Architecture, product concepts, domain vocabulary, and business rules live in
  versioned repo-local docs.
- Docs have owners or refresh triggers when practical.
- Generated references are marked as generated and can be regenerated.
- External knowledge needed by agents is copied or summarized into the repo.
- Procedural agent guides that became complex or heavily reused are promoted to
  project-local skills.
- Local project skills live under `.agents/skills`, with `.claude/skills`
  symlinked there whenever local skills exist.

### Observed Friction

- Recent review, CI, setup, and corrective-change evidence is inspected when
  accessible.
- Recommendations identify the concrete failure or delay they prevent.
- Observed recurring problems outrank speculative checklist completeness.

### Validation Surface

- The project has clear setup, build, lint, typecheck, and test commands.
- Formatting, linting, type/schema checks, tests, and workflow checks exist for
  all applicable project surfaces.
- Agents can run targeted tests for a change without guessing.
- UI apps expose browser automation paths, fixtures, seed data, or screenshots
  when needed.
- CI failures are inspectable from local tooling or documented commands.

### Task Surface

- Standard tasks exist for setup, dev, build, format, format check, lint,
  typecheck, check, test, verify, doctor, and cleanup where relevant.
- Existing Make, Rake, package, or framework commands are wrapped rather than
  replaced when that preserves local conventions.
- `check` is fast and deterministic; `verify` is broader and used only when
  appropriate for the change.
- Task descriptions are discoverable through the task runner.

### Local Enforcement

- Every applicable fast check has an explicit pre-commit add/keep/change/n/a
  decision.
- Repositories without a canonical executable check measured within the hook
  budget are not penalized for missing hooks. Audits report `n/a` with the
  condition for reconsidering the hook after the check exists and is measured.
- Hook installation is part of setup and works in fresh clones and worktrees.
- Hooks reuse canonical tasks, stay within a measured latency budget, and scope
  staged-file operations safely.
- Typechecking is automatic only when its scope is sound and fast enough.
- Targeted work, hooks, handoff tasks, and CI have clear evidence ownership so
  validation is not repeated without added coverage.
- CI or an explicit handoff task remains authoritative when hooks are bypassed.

### Observability and Reproduction

- Local dev exposes useful logs and error output.
- Bug reports can become reproducible scripts, fixtures, tests, or browser
  flows.
- Performance, startup, or reliability targets have measurable commands.
- Long-running services can be started and torn down predictably.

### Enforced Architecture

- Dependency directions, layer boundaries, schemas, naming, and logging rules
  are mechanically checked when important.
- Error messages tell an agent how to fix violations.
- Review feedback that repeats, arrives late, or exposes a surprising high-risk
  failure becomes a lint, test, script, or doc update when practical.
- Boundaries are strict where they protect coherence and loose where local
  implementation freedom is cheap.

### Supply-Chain and Automation

- Dependency intake uses native package-manager cooldowns or equivalent policy
  where supported.
- GitHub Actions workflows are checked with `actionlint`, `zizmor`, and action
  pinning tooling when present.
- Third-party actions and reusable workflows are pinned and updateable through
  documented tooling where practical.
- CI permissions, secrets, lockfiles, and generated workflow artifacts have
  explicit review or validation paths.

### Entropy Control

- The repo tracks known tech debt or quality gaps.
- Cleanup work is small, recurring, and reviewable.
- Duplicated helpers, stale docs, and inconsistent patterns are detectable.
- Refactors improve future agent legibility, not just human taste.

## Output Shape

Use this compact format for audits:

```markdown
## Harness Readiness

Overall: Level <n> - <one sentence>

| Area | Level | Evidence | Hook decision | Trigger | Scope | Cost | Evidence owner | Next improvement |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| Project map | 2 | ... | n/a | editing | changed area | ... | author or agent | ... |
| Local enforcement | 1 | ... | change | commit | ... | ... | pre-commit hook | ... |
| Supply-chain and automation | 1 | ... | n/a | CI | repository | ... | CI | ... |

## Priority Changes

1. <high leverage, low/medium effort>
2. <next>
3. <next>

## Validation Strategy

- <commands or checks to run after changes>
```
