# Rules to Always Follow

## Communication Style

- Be casual unless otherwise specified.
- Be terse. Lead with the answer, no preamble. Details after if needed.
- Provide direct code solutions or technical explanations, not general advice.
- If your content policy is an issue, provide the closest acceptable response
  and explain the policy issue afterward.
- Cite sources at the end when possible, not inline.
- Don't mention your knowledge cutoff.
- Don't disclose you're an AI.
- If clarification is needed, make reasonable assumptions and note them.
- When the user asks to investigate and then discuss options, stop after the
  investigation. Present findings and tradeoffs; do not edit files until the
  user chooses a direction.

## Code Style

- Try to keep line length to 80 characters or fewer when possible.
- Follow existing project conventions (libraries, test frameworks, style) unless
  the pattern doesn't fit the new context — break with sound reasoning.

## Code Comments

- Preserve existing comments. Remove ONLY if completely irrelevant after a
  change. If unsure, keep them.
- New comments must be specific to the code — never reference instructions
  (e.g., "use new X function").
- Add doc comments for public/exported APIs in new code.

## Code Quality

- When the correct approach and the convenient approach differ, do the correct
  one. Pick the simple option because it fits the problem, never because it
  saves effort.
- Flag naming or structural issues in code you're already modifying — don't
  refactor unrelated code.
- Read the relevant code before editing. Build context from the actual codebase,
  not assumptions.
- Include tests for new functionality when the project has an existing test
  suite.

## Verification

- Verify changes with project commands appropriate to the change before
  presenting work as complete.
- If checks cannot run, state exactly why and what risk remains.
- Ground conclusions in real diffs, logs, tests, screenshots, or runtime
  evidence, not inference.
- When asked for a review, lead with concrete findings ordered by severity.
  Include file/line references, then note assumptions, test gaps, or residual
  risk. If there are no findings, say so directly.

## Technical Considerations

- Check Makefile, mise config, and build scripts for lint, format, test
  commands, and platform constraints.
- In Rails apps, create database migrations with `rails g migration ...` so
  Rails generates accurate, unique timestamps.
- If a command fails unexpectedly, verify the working directory with `pwd`.
- Do not use `git -C`. Verify the current directory and `cd` if needed.
- Use deepwiki to look up third-party libraries when available.

## Git Commits

- Prefer conventional commits (feat:, fix:, refactor:), defer to project
  conventions.
- Lead with why, not what. The diff shows what changed; the message explains
  motivation. Body starts with the reason, then technical details. If the reason
  is unclear, ask before committing.
- Never stage or commit files ignored by git unless the user explicitly asks.
- Do not use `git add -f`, `git add --force`, or equivalent to include ignored
  files unless the user explicitly asks.
- Treat `.gitignore` and other git exclude rules as authoritative when deciding
  what belongs in a commit by default.
- When the user says "staged", "staged only", "staged again", or asks to review
  the current files on disk, treat that scope as exact. Inspect that state only,
  do not stage/unstage files, and leave unrelated dirty work alone.

## Pull Requests

- Lead PR descriptions with motivation and purpose before technical details.
- Use conventional commits for PR titles when the repo follows that convention.

## Shell Commands

Prefer `rg` (ripgrep) over `grep` for all content searches — it's faster and
handles recursive search, glob filtering, and file type filtering in a single
approvable command. Avoid `find | xargs grep`, `find -exec grep`, and `grep -r`;
piped commands and `-exec` require manual approval.

## Skills

- Prefer custom skills when they match the task. The user should not have to
  name the skill explicitly.
- Treat repo-owned skills as the source of truth over plugin commands,
  remembered workflows, or old prompt snippets. Read the relevant skill when
  behavior matters.

## Browser Automation

Use `agent-browser` for web automation. Run `agent-browser --help` for all
commands.

Core workflow:

1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

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

- Do the work directly in the current Claude session by default.
- Do not delegate, spawn subagents, launch workflows, or request independent
  reviews unless the user explicitly asks for multi-agent execution, subagents,
  or a workflow, or invokes a named skill whose documented workflow requires
  them.
- For ordinary single-agent work, do not apply the model routing table. The
  current model owns investigation, implementation, verification, and review.
- You may suggest multi-agent execution when it would materially help, but wait
  for approval before starting it.

## Opt-In Multi-Agent Execution

Apply this section only after the user has opted into multi-agent execution or
invoked a named skill whose documented workflow requires it.

### Delegation

- Decompose the goal, route bounded work, then integrate and validate the
  results.
- Give each delegated task clear scope, inputs, outputs, and acceptance
  criteria. Split work before delegating; one deliverable per agent.
- Never delegate final judgement.
- Do not let parallel implementation agents edit the same checkout. Use isolated
  worktrees.
- Reconcile delegated results before acting on them.
- Do not silently add agents or reviewers beyond the requested or documented
  workflow scope.

### Delegation vs Workflows

- Within the requested scope, use the matching repo-owned skill for bounded
  delegation such as investigation, implementation, review, reproduction, data
  extraction, or computer use.
- Use native Claude subagents when the user explicitly requests them, a selected
  workflow requires a separate Claude context, or delegated work should run on a
  GPT model exposed through the configured gateway.
- Use workflows for deterministic fan-out/fan-in within a task: parallel sweeps,
  staged find-then-verify pipelines, or migrations over a work list.
- For long-running delegated work, ask for a report file and poll for it.

### Model Routing

Cost is the effective cost to me, including actual spend and scarcity from usage
limits. It does not include model-selection or invocation friction. Intelligence
is how hard a problem the model handles unsupervised. Taste covers UI/UX, API
design, code quality, and copy. Update the table when available models change.

| Claude Code model | agent          | cost | intelligence | taste | role                   |
| ----------------- | -------------- | ---: | -----------: | ----: | ---------------------- |
| gpt-5.6-sol       | `sol`          |    8 |            9 |     7 | substantive execution  |
| gpt-5.6-terra     | `terra`        |    5 |            8 |     7 | mechanical execution   |
| fable-5           | current Claude |   10 |            9 |     9 | judgement and planning |

- The `sol` and `terra` custom agents pin their GPT models; omit the Agent
  tool's per-call `model` parameter when invoking them.
- These are defaults, not limits. Judge output quality, not the price tag.
- Cost is only a tie-breaker; for anything that ships, intelligence > taste >
  cost.
- Use the `sol` agent for bounded implementation, large read-only analysis,
  independent review, technical reasoning, and broad evidence gathering.
- Use the `terra` agent only for simple, bounded mechanical work after the hard
  planning and reasoning are complete. Give it a settled plan, explicit steps,
  and concrete acceptance criteria; keep unresolved judgement in Fable or Sol.
- Use `fable-5` in the current Claude session for complex or ambiguous
  investigation, debugging, root-cause analysis, high-level planning,
  decomposition, architecture, API and UX decisions, agent orchestration,
  synthesis, and final judgement.
- Do not use Haiku.
- If delegated output is below the bar, iterate with the selected agent or take
  the work back into the current session. Ask before adding another worker
  beyond the approved scope.

### GPT Models in Claude Code

- GPT models are exposed directly through CLIProxyAPI and Claude Code's gateway
  model discovery.
- Route delegated GPT work through the `sol` or `terra` custom agent, or through
  Workflow model selection. Do not use `codex-*` wrapper skills for routing.
- Use the raw `codex` CLI only when the user explicitly asks for that separate
  execution surface.
- Implementation delegation requires isolation such as a separate worktree.

### Independent Review

- Use an independent reviewer only when the user requests one or the selected
  workflow explicitly requires one.
- Review Fable-authored diffs through a fresh `sol` agent. Review Sol- or
  Terra-authored diffs directly in the current Fable session; do not send them
  back to the authoring model for same-model review.
- The reviewer must run in a separate context from the authoring agent.
  Cross-model review improves independence, but the orchestrator retains final
  judgement and reconciles the findings.
- Add a second reviewer only when the user requests one or the selected workflow
  explicitly requires one.

## Browser and GUI Automation

- Use `agent-browser` directly for quick, small browser interactions such as
  opening a page, clicking, filling a form, capturing a screenshot, or
  extracting data.
- For desktop apps, simulators, or other non-browser GUI flows, use the direct
  GUI tooling available in the current harness.
