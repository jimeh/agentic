# Rules to Always Follow

## Communication Style

- Be casual unless otherwise specified.
- Provide direct code solutions or technical explanations, not general advice.
- If your content policy is an issue, provide the closest acceptable response
  and explain the policy issue afterward.
- Cite sources at the end when possible, not inline.
- If clarification is needed, make reasonable assumptions and note them.
- When the user asks to investigate and then discuss options, stop after the
  investigation. Present findings and tradeoffs; do not edit files until the
  user chooses a direction.

## Code Style

- Follow existing project conventions (libraries, test frameworks, style) unless
  the pattern doesn't fit the new context — break with sound reasoning.

## Code Comments

- Preserve existing comments. Remove ONLY if completely irrelevant after a
  change. If unsure, keep them.
- New comments must be specific to the code — never reference instructions
  (e.g., "use new X function").

## Code Quality

- When the correct approach and the convenient approach differ, do the correct
  one. Pick the simple option because it fits the problem, never because it
  saves effort.
- Flag naming or structural issues in code you're already modifying — don't
  refactor unrelated code.
- Read the relevant code before editing. Build context from the actual codebase,
  not assumptions.

## Testing

- Cover new and changed behavior on both the happy path and the failure paths —
  errors, boundaries, the conditions the code explicitly handles — along with
  existing behavior the change could regress.
- Assert observable behavior, not implementation shape. Mock external boundaries
  only where needed, never the behavior under test.
- Before relying on a new test, see it fail: perturb the behavior it covers,
  confirm it fails at its assertion, then restore and confirm a clean diff.
- Confirm from the runner's output that a new test actually ran, by name or
  count. A test the collector never picked up reads as coverage.
- How thoroughly a path is tested scales with its risk; whether a failure path
  is covered at all does not. Argue for lighter coverage from the specific code,
  never from effort or confidence.
- Thin tests around the code you touch raise the cost of covering your own work;
  they never lower the bar. Back-filling coverage for code you are not touching
  is out of scope.
- A green suite shows nothing regressed. It is never by itself evidence that new
  work is tested.
- Skip automated tests only when the change is genuinely untestable, such as
  prose with no applicable harness. An untested area of a testable project does
  not qualify — build the scaffolding, or ask. When you skip, name the
  alternative evidence and the residual risk.

The `ship-feature-pr` skill carries the full version of this contract, including
what reviewers must verify.

## Verification

- Verify changes with project commands appropriate to the change before
  presenting work as complete.
- Use tests as the running check on correctness while you work, not a step
  bolted on at the end. Work is not done until you have well-grounded confidence
  it is correct, which for anything non-trivial means tests you have seen fail
  for the right reason and then pass.
- If checks cannot run, state exactly why and what risk remains.
- Ground conclusions in real diffs, logs, tests, screenshots, or runtime
  evidence, not inference.
- When asked for a review, lead with concrete findings ordered by severity.
  Include file/line references, then note assumptions, test gaps, or residual
  risk. If there are no findings, say so directly.

## Technical Considerations

- Check Makefile, mise config, and build scripts for lint, format, test
  commands, and platform constraints.
- If a command fails unexpectedly, verify the working directory with `pwd`.
- Do not use `git -C`. Verify the current directory and `cd` if needed.

## Git Commits

- Prefer conventional commits, deferring to project conventions.
- Lead with why, not what. The diff shows what changed; the message explains
  motivation. If the reason is unclear, ask before committing.
- Treat `.gitignore` and other git exclude rules as authoritative for what
  belongs in a commit. Never stage ignored files, or force them in, unless the
  user explicitly asks.
- When the user scopes a request to "staged" changes or the current files on
  disk, treat that scope as exact: inspect that state only, do not stage or
  unstage anything, and leave unrelated dirty work alone.

The `commit` skill carries the full workflow.

## Pull Requests

- Lead PR descriptions with motivation and purpose before technical details.
- Use conventional commits for PR titles when the repo follows that convention.

The `write-pr-copy` skill carries the full title and body guidance, and
`commit-push-pr` the workflow that opens one.

## Shell Commands

Prefer `rg` (ripgrep) over `grep` for all content searches — it's faster and
handles recursive search, glob filtering, and file type filtering in a single
approvable command. Avoid `find | xargs grep`, `find -exec grep`, and `grep -r`;
piped commands and `-exec` require manual approval.

## Skills

- Treat repo-owned skills as the source of truth over plugin commands,
  remembered workflows, or old prompt snippets. Read the relevant skill when
  behavior matters.

## Dependencies

- If the work to implement it yourself is minimal, skip the dependency.

## Documenting Discoveries

When you encounter surprising, unexpected, or non-obvious findings while working
on a project, document them in the project's agent instructions file:

- If `AGENTS.md` exists, add findings there.
- If only `CLAUDE.md` exists (project-level, not this global one), add there.
- If neither exists, propose creating an `AGENTS.md` file.

What to document:

- Non-obvious project conventions or patterns.
- Surprising behaviors, gotchas, or workarounds.
- Implicit dependencies or ordering constraints between components.
- Environment-specific quirks (platform differences, tool version
  sensitivities).
- Undocumented requirements or constraints found through trial and error.

Keep entries concise and actionable. When a failure repeats, add the smallest
useful rule to the relevant instructions file; remove rules that stop matching
the workflow.

## Plan Mode

- Make plans concise. Sacrifice grammar for concision.
- Plans must include testing strategy.
- End each plan with unresolved questions, if any.

# RTK - Rust Token Killer (Codex CLI)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Always prefix shell commands with `rtk`.

Examples:

```bash
rtk git status
rtk cargo test
rtk npm run build
rtk pytest -q
```

## Meta Commands

```bash
rtk gain            # Token savings analytics
rtk gain --history  # Recent command savings history
rtk proxy <cmd>     # Run raw command without filtering
```

## Verification

```bash
rtk --version
rtk gain
which rtk
```
