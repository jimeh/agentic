# Context engineering rework — plan (2026-07-27)

Status: **completed**, landed in [#31][pr]. Kept as the record of what was
decided and why.

Inputs: the [Claude 5 context-engineering post][post], a local `/doctor` report
of this machine's Claude Code setup (not committed — it is machine-specific
telemetry), and a read of `rules/`, `skills/`, `plugins/`, `agent-config.toml`.

Revision 4 — all review questions answered; no blocking questions remain. Six
phases, ordered so each shrinks the surface of the next. Landing as **one PR,
one commit per phase**, so review can proceed phase by phase.

[pr]: https://github.com/jimeh/agentic/pull/31
[post]:
  https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models

---

## Phase 0 — Remove the gateway model routing

Per review: drop the `sol`/`terra` agent definitions. They resolve their model
pins only under CLIProxyAPI, and a session that is not running through it gets a
silent fallback to the default model — a hazard that costs more than the
capability is worth. The `bin/` launchers stay; they run a whole session on
another model and do not depend on the agent files.

GPT delegation goes through the `codex-*` skills, which wrap the Codex CLI and
work in every session.

### Delete

- `claude/agents/sol.md`, `claude/agents/terra.md`
- `agent-config.toml:12-13` — the two `claude/agents/*` symlink entries
- `packages/agent-config/src/install.test.ts:179-191` — the whole "installs
  managed Claude gateway agent symlinks" test
- `rules/claude.md:94-118` — `### GPT Models in Claude Code`, the whole section
  (the `printenv ANTHROPIC_BASE_URL` probe and the gateway/direct-mode fork)
- `rules/claude.md:87-88` — "the `sol` and `terra` custom agents pin their GPT
  models; omit the Agent tool's per-call `model` parameter"

### Keep, no change

- `agent-config.toml:15-18` — `bin/{clide,claudex,fable,opus}` symlinks
- `install.test.ts:193-211` — "installs managed CLI wrapper symlinks" stays
  valid, the launchers are untouched
- `staleSymlinkCleanup` entry for `claude/agents`. It is what removes the now-
  orphaned `~/.claude/agents/{sol,terra}.md` links on the next install. Verified
  safe against a deleted source dir: `cleanupStaleLinks` (`install.ts:531-568`)
  resolves with `resolve()`, not `realpath`, and matches dangling links by
  prefix.

### Edit

- `rules/claude.md:57-62` — routing table drops the `gpt-5.6-terra` and
  `gpt-5.6-sol` rows, leaving two. A cost/intelligence/taste table for two
  Claude models is not worth the scaffolding; collapse to prose bullets: Opus is
  the default for delegated Claude work, Fable for exceptionally hard problems.
- `rules/claude.md:79-86` — replace the Sol and Terra bullets with one: GPT work
  goes through the `codex-*` skills, which run the Codex CLI.
- `rules/claude.md:115-117` — drop the raw-`codex`-CLI last-resort bullet. With
  no direct/gateway fork there is no fallback ladder to describe.
- `rules/claude.md:127` — `### Independent Review`, cross-engine review is
  `codex-review`; drop the `sol` mention.
- `agent-config.toml:34-39` — comment describes `codex-*` scoping as a
  "direct-mode fallback when no CLIProxyAPI gateway backs the sol/terra agents".
  Rewrite: `codex-*` skills are the Codex CLI handoff path, Claude-only.
- `AGENTS.md:62-63` — the sol/terra sentence goes. Keep one line noting managed
  subagents can be linked individually via `symlinks`, with none currently
  defined, so the surviving `staleSymlinkCleanup` entry is not unexplained.

Resident-token effect is realised in phase 3a, which moves this whole block out
of the global rules regardless. Phase 0's value is a leaner skill, no shell
probe before doing work, and no silently-degrading model pin.

---

## Phase 1 — Mechanical fixes and out-of-repo cleanup

No judgment calls. Everything here is either a config flag or a file outside the
repo.

### In-repo

- `claude/settings.json:164-174` — set five `enabledPlugins` to `false`:
  `plugin-dev`, `claude-md-management`, `frontend-design`, `code-simplifier`,
  `ruby-lsp`. **~1,994 est. tokens.** `plugin-dev` alone is 1,772 with zero uses
  in 92 startups.
- `AGENTS.md:67-72` — factual fix. Text claims `codex-*` skills are excluded
  from both skill roots. Verified false: `agent-config.toml:45-48` links them
  into `~/.claude/skills`, and all five are live symlinks there. Phase 0
  rewrites this paragraph anyway; land the correction with it.

### Out-of-repo, for the reviewer to run

- Delete `~/.claude/settings.json.bak`, `.bak2`, `.bak3`, `~/.claude/RTK.md.bak`
  (live files are git-tracked symlinks; nothing lost)
- Delete `~/.agents/skills/find-skills` and
  `~/.agents/skills/moshi-best-practices` plus their `~/.claude/skills/*`
  symlinks. **~200 est. tokens.**

  **Correction to revision 2:** these two are _not_ managed by this repo.
  Verified — they are real directories in `~/.agents/skills/`, symlinked into
  `~/.claude/skills/` by something else, while every repo-managed skill resolves
  to `/home/jimeh/.config/agentic/...`. Putting them in an `agent-config.toml`
  `exclude` list would have been a silent no-op. `agent-config`'s stale cleanup
  only touches links pointing into its own source roots, so it will neither
  remove nor recreate them.

Re-check `git status` in the root checkout first — the doctor scan ran with
`claude/settings.json`, `codex/config.toml`, `codex/hooks.json` dirty.

---

## Phase 2 — Skill listing diet

The listing is 5,266 est. tokens against a ~2,000 budget (~1% of window). Past
budget, descriptions truncate and routing degrades for _every_ skill. This is a
correctness problem, not just cost.

### 2a. Trim descriptions — first-party only (the main work)

Per review, `thirdparty/skills/` is off limits. That is also the mechanically
correct call: `thirdparty/skills.lock.json` records content hashes and
`lint:agent-harness` verifies them, so editing vendored frontmatter breaks the
lock.

First-party trim targets, ~1,900 est. tokens combined, plus `agent-browser`
(240) once 2c makes it first-party:

| Skill                      | Est. tokens |
| -------------------------- | ----------: |
| `agent-browser` (after 2c) |         240 |
| `codex-computer-use`       |         176 |
| `ship-feature-pr`          |         161 |
| `clean-gone-branches`      |         160 |
| `codex-review`             |         160 |
| `codex-implementation`     |         160 |
| `harness-engineering`      |         150 |
| `codex-first`              |         150 |
| `codex-analysis`           |         146 |
| `html-planning`            |         142 |
| `write-pr-copy`            |         111 |
| `pr-feedback-review`       |         108 |
| `rebase`                   |          93 |
| `commit-push-pr`           |          91 |

Rewrite each as an intent-shaped one-liner: what the skill does, plus the one
condition that distinguishes it from its neighbours. Drop the quoted-phrase
trigger lists — they were written for older routing, and the post's shift #2 is
exactly this.

Also drop `gpt-5.6-sol` from the four `codex-*` descriptions. The model name is
a maintenance liability and the Codex CLI's model is set in
`codex/config.toml:3`.

Target: halve them, **~800 est. tokens**, zero capability loss.

### 2b. Scope out unused skills (final list)

`skills` entry `exclude`, add:

- `vuln-scan-orchestrator` (86)
- `frontend-design-systems` (127)

`thirdparty/skills` entry: **no change.** All vendored skills stay per review.

Kept against the doctor report: `clean-gone-branches`, `shadcn`,
`react-high-performance`, `vercel-react-best-practices`,
`web-design-guidelines`.

`find-skills` and `moshi-best-practices` moved to phase 1 — not repo-managed.

**~213 est. tokens** (was 942 in the doctor plan).

### 2c. Fork `agent-browser` into a first-party skill

Per review. `agent-browser` is the single largest listing entry at 240 est.
tokens — 12% of the whole budget — and vendoring made it untouchable. Forking
removes that floor.

Forking is unusually cheap here. `thirdparty/skills/agent-browser/SKILL.md` is
one file of 3,364 chars, and it is explicitly _"a discovery stub, not the usage
guide"_ — the real content is served at runtime by
`agent-browser skills get core`. The stub itself says its content _"cannot
change between releases"_, so the fork has almost no drift to track. The
description alone is 1,166 chars, roughly a third of the file.

- Copy to `skills/agent-browser/SKILL.md`
- Rewrite the description from 1,166 chars to ~200: what it does, that it also
  covers Electron desktop apps, and that it is preferred over built-in browser
  tools. Drop the quoted-phrase list and the Slack/Vercel/Bedrock enumeration.
  **~195 est. tokens.**
- Change the install line from `npm i -g agent-browser && agent-browser install`
  to `mise use -g npm:agent-browser && agent-browser install`
- Keep `allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)`
- Decide on `hidden: true` — it is in the upstream frontmatter, yet the skill
  still appears in the listing and the doctor report counted its tokens. Either
  it does nothing here or it does not do what the name suggests. Drop it unless
  there is a reason to keep it.

Then remove the vendored copy entirely: delete the `agent-browser` source block
from `thirdparty/skills.manifest.json`, its entry from
`thirdparty/skills.lock.json`, and `thirdparty/skills/agent-browser/`.

**This removal is required, not tidiness.** Both skill roots target
`~/.claude/skills`, so two skills with the same directory name collide, and
`install.test.ts:466` pins the resolution: the later `[[skillSymlinks]]` entry
wins. `thirdparty/skills` is the last entry in `agent-config.toml`, so leaving
the vendored copy in place would silently keep it winning and the fork would
never load.

Cost accepted: `mise run thirdparty:update-skills` no longer tracks it. Given
the stub is version-stable by design, that is close to free — worth a manual
diff against upstream if the CLI ever restructures its skill delivery.

---

## Phase 3 — Move always-loaded content behind lazy loading

### 3a. Multi-agent playbook out of global rules

`rules/claude.md:19-133` is 43% of `generated/CLAUDE.md` (6,565 chars ≈ 1,641
est. tokens), resident in every session of every project, and its own opening
line scopes it to "after the user has opted into multi-agent execution".

- New `skills/multi-agent-execution/SKILL.md` — body is the post-phase-0
  remainder of lines 19-133
- `rules/claude.md:8-18` `## Execution Mode` stays **unchanged**. It is the
  safety gate. Gates stay resident. Add one pointer line to the skill.
- New `[[skillSymlinks]]` entry, `only = ["multi-agent-execution"]`,
  `targetRoots = ["~/.claude/skills"]` — same pattern as the `codex-*` entry, so
  Codex and opencode do not inherit Claude's routing rules

**~1,641 est. tokens**, minus one new listing entry. Do phase 2a first so the
listing has headroom.

### 3b. Delete both browser sections

Per review: the `agent-browser` skill is the only place browser guidance should
live. Delete `rules/base.md:140-150` (`## Browser Automation`, the 4-step CLI
walkthrough) and `rules/claude.md:134-141` (`## Browser and GUI Automation`)
outright — no pointer line. The skill's description already triggers on browser
work and its body carries the CLI reference. **~250 est. tokens.**

Accepted loss: `claude.md:139-141` also covered non-browser desktop GUI
(simulators, native apps). `agent-browser`'s description already names Electron
desktop apps, and `codex-computer-use` covers GUI verification, so the path
survives — but it is no longer stated anywhere resident.

### 3c. Trim derivable content from `AGENTS.md`

- `## Commands` L7-49 → pointer to `mise tasks`, which reproduces all 35 tasks
  with the same descriptions. Keep the note that `thirdparty:add-skills` takes
  its argument after `--`. **~560 tokens.**
- Semver primer L147-153 → cut. Keep L155-158; the "update both files" gotcha is
  repo-specific. **~100 tokens.**
- `### Agent-Specific Config` L124-128 → cut; `ls claude/ codex/` shows it.
  **~32 tokens.**

Keep `## Discoveries`, the auto-discovery and precedence contracts,
`### Global Rules`, `## Testing`, `## Dependency Policy`, `## Formatting`,
`## Before Committing`, `## phased-work Plugin`, `## Shell Conventions`,
`### Marketplace Manifest`.

---

## Phase 4 — Deduplicate the contracts

The doctor report found nothing here because its dedup check only compared
`~/.claude/CLAUDE.md` against `AGENTS.md`. The duplication is across rules ↔
skills.

Plugins are **out of scope** per review — every plugin except `rtk` is
deprecated or superseded by skills, and they are left dormant.

The shape this phase settles on: **`commit-push-pr` becomes pure
orchestration**, referencing two single-source skills rather than inlining
either.

### 4a. `commit` owns commit guidance

Precedent already exists — `skills/ship-feature-pr/SKILL.md:320` says _"Use the
`commit-push-pr` skill for commit conventions, push behavior, template
detection, and PR copy"_. Both skills link into both skill roots, so Codex keeps
access.

- **`commit`** owns it end to end: context gathering, the agent-docs check with
  its "things worth documenting" list, branch safety, message conventions,
  staged-only mode, ignored-file rules.
- **`commit-push-pr:18-101`** drops its inlined copies of steps 1, 3, 4, 5 and
  references `commit`.
- **`rules/base.md:104-123`** keeps the one-line policy only — conventional
  commits, lead with why, `.gitignore` is authoritative.
- **`codex/config.toml`** keeps its own inlined copy. Codex does not expand `@`
  references (per `AGENTS.md` Discoveries), so that is a platform constraint,
  not accidental drift.

### 4b. `write-pr-copy` owns PR copy guidance

Answering the review question: yes, and it is the better structure. It
symmetrises with 4a and resolves the zero-use problem — the skill stops being
dead weight and becomes load-bearing.

- **`write-pr-copy`** owns PR title and body guidance: template-driven body
  structure, motivation-first descriptions, Manual QA rules, the copy-hygiene
  block, the honesty rules.
- **`commit-push-pr`** drops `SKILL.md:113-167` and references it, keeping only
  what is genuinely its own: template _detection_, push, the full-scope diff,
  and the `gh pr create` mechanics.
- **`harness.ts:55-75`** — `prCopyInstructionPaths` exists solely to keep three
  copies aligned. With one source it has nothing to align. **Delete the check**
  and its `prCopyHygieneRules` list.

On the name: **keep `write-pr-copy`.** The verb phrasing is what makes it route
on "write me a PR description", which is still a first-class standalone use.
`pr-copy` would read more like a reference doc and pair more neatly with
`commit`, but it triggers worse, and routing beats symmetry.

Cost worth naming: a PR request can now hop `commit-push-pr` → `commit` →
`write-pr-copy`. Three skills for one task. Each is small after dedup and the
hops only happen when the work is actually being done, but it is real overhead
and the reason to keep `commit-push-pr` genuinely thin rather than
half-referencing.

### 4c. Testing contract — asymmetric split, deliberately

Per review: `rules/base.md:42-77` compresses to the essence;
`skills/ship-feature-pr/SKILL.md:55-89` keeps the full contract, since that is
where the bar matters most.

Keep in `base.md`: cover happy and failure paths; assert observable behavior;
see a new test fail before relying on it; confirm from runner output that it
ran; a green suite is not evidence new work is tested. Drop the elaboration on
each.

This leaves intentional partial overlap. That is correct — `base.md` has to
stand alone for ordinary work where `ship-feature-pr` never loads.

---

## Phase 5 — Judgment trims in `rules/base.md`

Confirmed on review: all of these land.

- **`base.md:24-30` `## Code Comments`** — live conflict. Mandates doc comments
  on all exported APIs while the current system prompt says match surrounding
  comment density. This is the post's own example failure mode ("leave
  documentation as appropriate" vs "DO NOT add comments" in one request).
  Resolve in favour of the system prompt.
- `base.md:11-12` — "don't mention your knowledge cutoff", "don't disclose
  you're an AI". Harness defaults.
- `base.md:6` — "be terse, lead with the answer". Duplicates system prompt.
- `base.md:132-138` `## Skills` — duplicates the Skill tool description.
- `base.md:20` — 80-char line length. oxfmt enforces this already; a formatter
  beats a prompt rule.
- `base.md:98-99` — Rails migrations. **Extract to a new lean
  `skills/rails-best-practices/SKILL.md`** covering the `rails g migration`
  timestamp guidance only. Caveat: there is no load-on-project-type mechanism —
  description matching is the only lever, so the description must name Rails,
  ActiveRecord, and migrations directly. A project-level `AGENTS.md` line is the
  backstop if it turns out not to fire.
- `base.md:102` — "use deepwiki when available". The MCP server is
  unauthenticated; the rule points at a tool that may not resolve.

`rules/base.md` is shared with Codex and opencode. Those models may need
guardrails Opus 5 does not. Prefer moving Claude-redundant rules into
`rules/agents.md` (currently empty, exists for exactly this) over deleting them
outright.

---

## Testing strategy

Two genuine code changes: `install.ts` behavior in phase 0 and `harness.ts` in
phase 4. Everything else is prose and config.

### Phase 0 — the deleted agent symlinks

Deleting the `install.test.ts:179-191` assertion is not coverage; it removes
coverage. The behavior that now matters is that orphaned agent symlinks get
cleaned up on the next install.

- Add a test: seed `~/.claude/agents/sol.md` pointing into `claude/agents/`, run
  install with no such source, assert the link is gone.
- Prove it before relying on it — perturb `cleanupStaleLinks` (`install.ts:559`,
  drop the `!existsSync(realTarget)` arm), confirm the new test fails at its
  assertion rather than on a build error, restore, confirm clean diff.
- Confirm from runner output that it ran, by name.

### Phase 4 — deleting the PR-copy check

`harness.ts:55-75` gets deleted outright under 4b. `harness.test.ts` is 760
bytes and never covered it, so there is no test to delete alongside.

- Confirm `mise run lint:agent-harness` still passes and still enforces its
  other invariants — slug safety, vendored content hashes, plugin/marketplace
  version parity. Perturb one of each to see the check still fires, then
  restore.
- No new test for removed behavior; the evidence is that the surviving
  invariants still catch what they own.

### Phases 2 and 3 — config changes with existing coverage

`only`/`exclude` scoping is already well covered: `install.test.ts:390` (globs
scope per target root), `:417` (cleanup removes links scoped out), `:466`
(cleanup replaces links whose source moved), `:507` (executor wrappers scoped to
the other root). The new `multi-agent-execution` entry and the phase 2b
`exclude` additions exercise paths these tests already pin. Run the suite; no
new install tests needed.

The 2c fork is the same machinery in the opposite direction from `:466` — a
skill name moving from `thirdparty/skills` to `skills`. That test proves the
relink happens; it does not prove the direction we want, which is why the
vendored copy is deleted rather than shadowed.

Specific to 2c, verify from `agent-config:dry-run` output that exactly one
`agent-browser` link is planned and its source is `skills/agent-browser`. Also
confirm `mise run lint:agent-harness` still passes after the manifest and lock
entries are removed — that check verifies vendored content hashes, so a
half-removed entry is exactly the kind of thing it should catch.

### Every phase

- `mise run rules:check` — catches `generated/` drift; also runs under
  `mise run lint`
- `mise run lint` — includes `lint:agent-harness`
- `mise run test` — unit plus plugin shell tests
- `mise run format`, then `mise run check`, then `mise run verify`

### Install verification — not run in this session

Per review, **do not run `mise run agent-config:install`.** The reviewer runs it
after reading the full PR.

- `mise run agent-config:dry-run` is safe and _is_ run, per phase, reading the
  planned link/removal list as the evidence that scoping changes do what the
  diff claims
- Post-merge, by the reviewer: `~/.claude/agents/` has no `sol.md` or
  `terra.md`; `~/.claude/skills` has no `vuln-scan-orchestrator` or
  `frontend-design-systems`; `multi-agent-execution` is present in
  `~/.claude/skills` and absent from `~/.agents/skills`

Residual risk: dry-run proves the _plan_, not the filesystem result. Symlink
creation and stale cleanup are covered by `install.test.ts` against a temporary
`HOME`, which is the substitute. The gap is real but small.

### Phases 1, 3c, 5 — prose with no harness

Evidence is `mise run lint` plus `/context` in a fresh session to confirm the
resident-token drop against the doctor baseline. Residual risk: behavior
regressions from trimmed rules are invisible to every check here. That is the
argument for phase 5 landing as its own commit, last, easy to revert alone.

---

## Expected outcome

| Phase                                    | Est. tokens |
| ---------------------------------------- | ----------: |
| 1 — disable 5 plugins                    |       1,994 |
| 1 — remove 2 unmanaged skills            |         200 |
| 2a — trim first-party descriptions       |        ~800 |
| 2b — scope out 2 skills                  |         213 |
| 2c — fork and trim `agent-browser`       |         195 |
| 3a — multi-agent → skill (incl. phase 0) |       1,641 |
| 3b — delete browser sections             |         250 |
| 3c — trim `AGENTS.md`                    |         692 |
| 4, 5 — dedup and judgment trims          |        ~300 |
| **Total**                                |  **~6,285** |

Against a ~12,326 baseline. Phase 0 is not a separate line: everything it
deletes sits inside the block 3a moves out, so counting both would double-count.
Its value is a leaner skill and one less hazard, not resident tokens.

`generated/CLAUDE.md` goes from 15.7KB to roughly 6KB.

The skill listing now plausibly lands **under** its ~2,000 budget, which
revision 3 did not expect:

| Step                                            | Running total |
| ----------------------------------------------- | ------------: |
| Baseline (29 user skills + plugins)             |         5,266 |
| Phase 1 — plugin listings                       |         3,272 |
| Phase 1 — `find-skills`, `moshi-best-practices` |         3,072 |
| 2b — two skills scoped out                      |         2,859 |
| 2a — first-party description trims              |        ~2,059 |
| 2c — `agent-browser` fork and trim              |        ~1,864 |
| 3a — new `multi-agent-execution` entry          |        ~1,914 |

Untouchable vendored remainder is ~646 (`airplan` 101, `rust-best-practices`
117, `shadcn` 110, `vercel-react-best-practices` 94, `frontend-design` 60,
`web-design-guidelines` 57, `rust-async-patterns` 59, `handoff` 28, `grill-me`
20), so ~1,900 is close to the practical floor without further removals. Treat
the 2a figure as the estimate most likely to move; measure with `/context` after
it lands.

Phase 4 saves little resident context. Its value is correctness: duplicated
contracts drift, and one already has (`AGENTS.md:67-72`).

---

## Resolved on review

- Drop `sol`/`terra` agents; keep the `bin/` launchers
- Keep `clean-gone-branches`, `shadcn`, both React skills,
  `web-design-guidelines`; exclude `frontend-design-systems` and
  `vuln-scan-orchestrator`
- Do not modify vendored skills — except `agent-browser`, which is forked
  first-party under 2c
- Delete both browser sections outright; `agent-browser` is the only home
- Plugins out of scope, left dormant
- All phase 5 cuts land
- One PR, one commit per phase
- Three-skill hop for a PR request is acceptable
- Keep the `write-pr-copy` name

## Open items

No blocking questions. Two judgment calls to make during implementation, both
recorded above:

1. **`hidden: true` in the forked `agent-browser` frontmatter** (2c) — present
   upstream, but the skill still shows in the listing. Drop unless a reason
   surfaces.
2. **The 2a estimate** — ~800 est. tokens assumes halving thirteen descriptions.
   It is the softest number in the plan. Measure with `/context` once 2a lands
   and revisit the listing budget from the real figure rather than this one.
