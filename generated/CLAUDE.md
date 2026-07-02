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

- Flag naming or structural issues in code you're already modifying — don't
  refactor unrelated code.
- Read the relevant code before editing. Build context from the actual codebase,
  not assumptions.
- Include tests for new functionality when the project has an existing test
  suite.

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

## Pull Requests

- Lead PR descriptions with motivation and purpose before technical details.
- Use conventional commits for PR titles when the repo follows that convention.

## Shell Commands

Prefer `rg` (ripgrep) over `grep` for all content searches — it's faster and
handles recursive search, glob filtering, and file type filtering in a single
approvable command. Avoid `find | xargs grep`, `find -exec grep`, and `grep -r`;
piped commands and `-exec` require manual approval.

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

Keep entries concise and actionable.

## Plan Mode

- Make plans concise. Sacrifice grammar for concision.
- Plans must include testing strategy.
- End each plan with unresolved questions, if any.

## Picking the right models for workflows and subagents

Rankings, higher = better. Cost reflects what I actually pay (OpenAI has really
generous limits), not list price. Intelligence is how hard a problem you can
hand the model unsupervised. Taste covers UI/UX, code quality, API design, and
copy.

| model    | cost | intelligence | taste |
| -------- | ---- | ------------ | ----- |
| gpt-5.5  | 9    | 8            | 5     |
| sonnet-5 | 6    | 5            | 7     |
| opus-4.8 | 4    | 8            | 8     |
| fable-5  | 2    | 9            | 9     |

How to apply:

- These are defaults, not limits. You have standing permission to override them:
  if a cheaper model's output doesn't meet the bar, rerun or redo the work with
  a smarter model without asking. Judge the output, not the price tag.
  Escalating costs less than shipping mediocre work.
- Cost is a tie-breaker only; when axes conflict for anything that ships,
  intelligence > taste > cost.
- Bulk/mechanical work (clear-spec implementation, data analysis, migrations):
  gpt-5.5 - it's very cheap and token efficient.
- Anything user-facing (UI, copy, API design) needs taste >= 7.
- Reviews of plans/implementations: fable-5 or opus-4.8, optionally gpt-5.5 as
  an extra independent perspective.
- Never use Haiku.
- Mechanics: gpt-5.5 is handled natively via the `openai/codex-plugin-cc` plugin
  inside Claude Code, automatically adopting your user-level configurations from
  `~/.codex/config.toml`. Avoid writing custom bash scripts; instead, utilize
  the plugin's built-in tools and skills:
  - `/codex:review` - Run non-destructive, read-only code quality assessments.
    Supports `--base <ref>` for branch analysis.
  - `/codex:adversarial-review` - Perform a skeptical design review to
    pressure-test tradeoffs, auth, and reliability. Append custom focus text at
    the end of the command to steer the focus.
  - `/codex:rescue` - Subcontract active debugging, multi-file refactoring, or
    implementation loops to Codex when a second pass is required.
  - `/codex:status` / `/codex:result` / `/codex:cancel` - Use these to check,
    fetch, or abort asynchronous jobs when using the `--background` flag on
    heavy tasks.
- Claude models (sonnet-5, opus-4.8, fable-5) run via the Agent/Workflow model
  parameter.

Using gpt-5.5 inside workflows and subagents:

- Subagents and automated workflows should call the plugin's native slash
  commands or its exposed `codex-cli-runtime` skills to delegate tasks directly,
  omitting the need for raw terminal wrappers.
- For closed-loop quality assurance, keep the review gate turned on via
  `/codex:setup --enable-review-gate`. This ensures a stop hook automatically
  challenges Claude's outputs using Codex before finalizing, preventing broken
  code or weak design assumptions from reaching the main session unvetted.
