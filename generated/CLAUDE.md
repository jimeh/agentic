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

Automated tests are not required merely because a file changed. Choose them in
proportion to behavioral risk, regression likelihood, repository policy, and the
cost and stability of the available harness. Material logic, explicit error
handling, boundaries, and bug regressions usually merit tests; low-risk prose,
presentation, configuration, generated artifacts, or mechanical changes may be
better verified with focused static, build, or runtime evidence.

When adding or changing automated tests:

- Cover the material successful, failure, boundary, and regression scenarios
  justified by the change's concrete failure modes. Not every permutation or
  touched line needs a test.
- Assert observable behavior, not implementation shape. Mock external boundaries
  only where needed, never the behavior under test.
- Prefer seeing a new test fail at its intended assertion before it passes. A
  test-first failure provides that evidence. When the implementation already
  exists, use a targeted perturbation only if the behavior is material and
  inspection cannot rule out a false-positive test; one representative
  perturbation can cover a behavioral cluster. Skip it for obvious direct
  assertions and trivial tests.
- Confirm from the runner's output that a new test actually ran, by name or
  count. A test the collector never picked up reads as coverage.
- Treat a green existing suite as regression evidence, not proof that new
  behavior is adequately tested.

When automated tests are not proportionate, name the alternative verification
evidence and any meaningful residual risk. Thin existing tests increase the cost
of adding good coverage but do not by themselves require building a new harness;
build scaffolding when the change's risk justifies it.

The `ship-feature-pr` skill carries the full version of this contract, including
what reviewers must verify.

## Verification

- Verify changes with project commands appropriate to the change before
  presenting work as complete.
- Use the strongest proportionate evidence as a running check while you work,
  not a step bolted on at the end. When automated tests are part of that
  evidence, run them during implementation and apply the testing rules above.
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

When CodeRabbit is selected for a pull request, or its feedback or review state
needs handling, use the `coderabbit-review` skill. It is the source of truth for
intentional triggering, thread-aware reconciliation, and review-state closure.

## Shell Commands

Prefer `rg` (ripgrep) over `grep` for all content searches — it's faster and
handles recursive search, glob filtering, and file type filtering in a single
approvable command. Avoid `find | xargs grep`, `find -exec grep`, and `grep -r`;
piped commands and `-exec` require manual approval.

## Skills

- Treat repo-owned skills as the source of truth over plugin commands,
  remembered workflows, or old prompt snippets. Read the relevant skill when
  behavior matters.
- A skill's documented workflow governs within its scope, including how and when
  it delegates. These rules are the default for everything it does not cover.

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

## Execution Mode

- When multi-agent execution is in play, load the `multi-agent-execution` skill
  for decomposition, model routing, and independent review.

@RTK.md

<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the
repo root), reach for it BEFORE grep/find or reading files when you need to
understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions
  in one call — the relevant symbols' verbatim source plus the call paths
  between them, including dynamic-dispatch hops grep can't follow. Name a file
  or symbol in the query to read its current line-numbered source. If it's
  listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"`
  prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is
the user's decision.

<!-- CODEGRAPH_END -->
