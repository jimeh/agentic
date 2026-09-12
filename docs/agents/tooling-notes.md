# Tooling notes

Consult these notes when changing the installer, headless runners, or vendor
intake. They record tool-specific behavior that source inspection may miss.

- Octokit request v10 ignores the `request.timeout` option; only
  `request.signal` cancels a call, and an aborted fetch surfaces with
  `status: 500`, so check your own timer before classifying the error. The
  PR-monitor CLI tests use a local HTTP server through a test-only preload; they
  never contact a live GitHub repository.

- The external `skill-creator` `quick_validate.py` helper may lack an executable
  bit and requires `PyYAML`. Invoke it through `python3`; if that dependency is
  missing locally, rely on manual frontmatter checks plus `mise run lint` for
  repo-local skill edits.
- `codex/config.toml` supports the
  `#:schema https://developers.openai.com/codex/config-schema.json` header for
  editor autocomplete/validation in tools like VS Code or Cursor with Even
  Better TOML.
- Leave Codex's `git-commit-instructions` and `git-pr-instructions` unset. They
  customize app buttons that are not used here; the installed `commit` and
  `file-pr` skills own those workflows without mirrored config copies.
- When testing `agent-config install` with a temporary `HOME`, tools resolved
  through mise shims can fail trust checks. Prefer POSIX tools for setup helpers
  where possible, and validate symlink cleanup before plugin setup side effects.
- A temporary `HOME` does not isolate `agent-config install`. It links
  `~/.claude/settings.json` to the repo's `claude/settings.json`, then Claude
  plugin setup writes through that symlink — so the run mutates tracked repo
  files, including stamping `extraKnownMarketplaces` with the absolute path of
  whichever checkout it ran from. Exercise install behavior through
  `install.test.ts` with a synthetic `--root` instead; those tests never point
  at the real repo config.
- For gone-branch cleanup, `git branch -v` shows `[gone]` and `git branch -vv`
  adds the upstream ref. Prefer `git for-each-ref` for scripts that need stable
  gone-branch detection.
- Codex reads `~/.codex/AGENTS.md` only and never falls back to
  `~/.agents/AGENTS.md`; with no file at the former, it loads no global
  instructions at all. Verify what a session actually sees with
  `codex debug prompt-input`, which renders the model-visible prompt.
- Codex does not expand `@path` references — they reach the model as literal
  text. Content that must reach Codex has to be rendered inline.
- opencode reads `~/.config/opencode/AGENTS.md`, falling back to
  `~/.claude/CLAUDE.md` only when that file is absent. Populating the former
  stops opencode inheriting Claude-only rules.
- Claude CLI's built-in `fable` alias lags behind new Fable releases (2.1.252
  still resolves it to `claude-fable-5`), so `claude-headless` maps friendly
  names to explicit model IDs itself. The CLI accepts an ID it does not know,
  logging `unrecognized_model` and reporting a 200K context window in its own
  metadata; the API still uses the model's real window.
- `thirdparty:add-skills` reports and skips unrelated upstream skills with
  malformed or non-slug metadata. Explicitly selecting an invalid skill still
  fails instead of vendoring metadata the local harness would reject.
- Codex CLI (0.152.x): `codex exec resume` and `codex exec review` accept
  neither `-s` nor `-C` nor `--add-dir`; `-c sandbox_mode="..."` works on every
  subcommand, so `codex-headless` sets the sandbox that way and always runs from
  the current directory. Review scope flags (`--uncommitted`, `--base`,
  `--commit`) reject a prompt argument, and without a `-` positional stdin is
  ignored. On failure Codex emits `error` then `turn.failed` and never writes
  the `-o` file. `item.completed` events carry full command output, so keep them
  out of any condensed log.
- Bun drops a bare `--` when it is the first argument to a script
  (`./run.ts -- -c x` yields `["-c", "x"]`). The headless runners rely on
  `--artifact-dir` or another option preceding `--`; a leading `--` cannot be
  detected from inside the script.

- Fixture repositories in vendor-skills tests inherit global commit signing.
  When the signing agent is unavailable, run verification with command-scoped
  `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=commit.gpgsign GIT_CONFIG_VALUE_0=false`.
  This affects fixture commits only when scoped to the test command; retain
  normal signing for delivery commits.
