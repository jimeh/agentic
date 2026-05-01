# Harness Readiness Rubric

Use this rubric to audit a repository for agent-first development. Score each
area from 0 to 3, then prioritize low-effort improvements that unlock future
agent validation or reduce repeated failures.

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

### Repository Knowledge

- Architecture, product concepts, domain vocabulary, and business rules live in
  versioned repo-local docs.
- Docs have owners or refresh triggers when practical.
- Generated references are marked as generated and can be regenerated.
- External knowledge needed by agents is copied or summarized into the repo.

### Validation Surface

- The project has clear setup, build, lint, typecheck, and test commands.
- Agents can run targeted tests for a change without guessing.
- UI apps expose browser automation paths, fixtures, seed data, or screenshots
  when needed.
- CI failures are inspectable from local tooling or documented commands.

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
- Review feedback that repeats becomes a lint, test, script, or doc update.
- Boundaries are strict where they protect coherence and loose where local
  implementation freedom is cheap.

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

| Area | Level | Evidence | Next improvement |
| --- | ---: | --- | --- |
| Project map | 2 | ... | ... |

## Priority Changes

1. <high leverage, low/medium effort>
2. <next>
3. <next>

## Validation Strategy

- <commands or checks to run after changes>
```
