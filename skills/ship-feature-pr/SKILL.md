---
name: ship-feature-pr
description: >-
  Orchestrate a feature end to end into a reviewed pull request: gather the
  feature and base branch, reuse an existing plan or create one, implement,
  commit and push, open a draft PR, run one Codex and one Claude reviewer in
  parallel,
  reconcile their findings, wait for CI, and mark the PR ready. Use when the
  user asks to
  ship a feature as a PR, run the feature PR pipeline, take a change end to
  end into a pull request, or orchestrate plan-implement-review for a PR. Do
  not use for tiny single edits, commit-only or PR-only requests, or
  review-only requests; dedicated skills cover those.
---

# Ship Feature PR

Take a feature request from description to a reviewed, ready pull request. The
orchestrating agent owns judgement — intake, plan approval, diff review,
reconciling reviewer findings, checkout handback, and delivery — and delegates
the typing.

Invoking this skill authorizes the branch, worktree, commit, push, and pull
request mutations the workflow requires. It never authorizes merging the PR,
deploying, or releasing; those need separate, explicit user say-so.

This skill is engine-agnostic: Claude or Codex can run it as the orchestrator.
Use native subagent or task tooling for same-engine implementation and review.
Use a dedicated cross-engine skill or CLI only when the work requires the other
engine. Do not invoke the orchestrator's own CLI merely for isolation or model
pinning when native subagents are available.

## Phases

1. Intake — feature, base branch, and delivery-checkout baseline.
2. Plan — reuse or create a plan, identify file scope, sanity check, approval.
3. Branch — prepare the feature branch in the delivery checkout.
4. Implement — usually one fresh implementer in an isolated worktree.
5. Commit, push, draft PR.
6. Dual review — one Codex reviewer and one Claude reviewer, in parallel.
7. Reconcile and fix — verify findings, fix, re-review the delta.
8. Deliver — wait for CI, hand back the checkout, mark ready, and report.

Do not skip phases or reorder the gates. Reusing an existing plan completes the
planning pass; it does not skip phase 2. Details below.

## 1. Intake

Treat the checkout active when the workflow is invoked as the **delivery
checkout**. It is the default final local home of the feature branch, whether it
is the repository's root worktree or a linked worktree.

Before branch movement or delegation, capture:

- invocation path and repository root;
- whether this is the root or a linked worktree;
- current branch, or detached-HEAD state, and current HEAD SHA;
- the complete dirty baseline, including staged, unstaged, and untracked paths,
  with enough per-path diff or content evidence to verify preservation later;
- `git worktree list --porcelain` output and the branch-to-worktree mapping.

Keep this baseline outside the repository or in an ignored temporary artifact
directory. Do not stash, discard, stage, or otherwise normalize existing user
changes just to begin the workflow.

Establish two inputs before any work:

- What should change: the feature or fix, in enough detail to plan from.
- Base branch: the branch the PR will target.

Ask the user only for what the invocation did not already provide. Default the
base branch to the repository's default branch
(`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`, or
`git remote show origin`) and state that assumption instead of asking.

Before planning, inspect the conversation and any referenced plan document for
the latest plan that applies to the requested feature. Record whether it is
settled, provisional, stale, or has unresolved choices. A plan is settled when
the user approved it explicitly, or when the user invokes this skill after a
completed planning discussion with no unresolved choices. Treat a settled plan
as approved and proceed without another approval stop.

Otherwise, plan approval (phase 2) is on by default. If the user said to run
without checkpoints ("just ship it", "don't ask, go"), skip the approval stop
and note that in the final report.

Then preflight before mutating work: verify `gh` authentication, push access to
the remote, and that the base ref exists on the remote. Select the same-engine
channel: native subagent/task tooling when available, otherwise the allowed
same-engine CLI fallback when native tooling is unavailable or lacks a required
capability. Also require the foreign reviewer channel. CLI version or
reachability checks are fine. Missing native tooling alone is not a blocker;
missing both same-engine channels or the foreign reviewer is.

## 2. Plan

Start with the plan found during intake:

- If it still applies to the feature, reuse it. Do not delegate a fresh planning
  pass merely to restate or independently validate it. Ask the user directly to
  settle any unresolved product or scope choices.
- If the existing plan has stale, contradictory, or incomplete code-grounded
  assumptions, resolve them directly when straightforward. Delegate a fresh
  planning pass only when doing so requires material replanning.
- If no applicable plan exists, delegate planning for a non-trivial feature to a
  fresh native planning subagent so the plan is grounded in a clean read of the
  code. Use a foreign-engine planning skill or CLI only when the task requires
  that engine; use a same-engine CLI only when native task tooling is
  unavailable or lacks a required capability.
- Plan directly when the change is small and the approach is obvious.

The plan must cover: approach, files to touch, testing strategy, risks, and
explicit non-goals. Fill minor omissions directly while freezing the
implementation spec; minor omissions do not justify another planning pass.

Then, as orchestrator:

1. Sanity-check the plan against the actual code. Resolve material gaps or
   assumptions that name files or APIs that do not exist. Delegate a new
   planning pass only when those problems require material replanning.
2. Treat a settled plan as already approved. For a provisional plan, present a
   condensed version to the user for approval unless autonomy was settled at
   intake. Revise on feedback; do not start implementing a plan the user pushed
   back on.
3. Freeze the approved plan into an implementation spec: objective, constraints,
   files, success criteria, verification commands.

Plan early enough to identify the intended file scope before deciding whether
the captured dirty baseline overlaps the feature. If exact files cannot yet be
known, identify the narrowest directories or generated outputs that could be
touched and treat uncertainty at that boundary as possible overlap.

## 3. Prepare the Delivery Branch

Prefer the delivery checkout. Detached HEAD, linked-worktree status, or being
outside the root worktree is not by itself a reason to relocate the workflow.

1. `git fetch origin <base>` so decisions use the current remote base.
2. Compare the approved implementation scope with the dirty baseline. Preserve
   non-overlapping user changes in place. Ask only when existing changes overlap
   the feature scope or branch movement would be unsafe.
3. Reuse a relevant existing feature branch when it represents this work. If the
   delivery checkout is detached at the intended base, create the feature branch
   there. If it is attached to the intended base, create the feature branch in
   place from the current remote base while preserving non-overlapping dirt.
   Follow the branch-naming rules in the `commit-push-pr` skill.
4. If the checkout is on an unrelated branch or its HEAD differs from the
   intended base, move it only when Git can do so without rewriting or losing
   the captured baseline. Ask when the safe destination is ambiguous.

Use a separate orchestrator checkout only for a concrete Git or environment
constraint that prevents safe delivery-checkout use. Record its path and reason;
it is temporary, not the default home of the branch. Never delete it until the
final branch is attached to the delivery checkout or the user explicitly accepts
another local destination.

## 4. Implement

Delegate implementation to exactly one fresh implementer working in an isolated
detached worktree or temporary implementation branch created from the feature
branch. Never let an implementer edit the delivery or orchestrator checkout. For
routing:

- Use the orchestrator's native subagent or task tooling for same-engine work.
- Use a dedicated cross-engine implementation skill or CLI only when the task
  specifically requires the other engine.
- Use a same-engine CLI only when native subagents are unavailable or lack a
  required capability. Do not use it merely to obtain worktree isolation or pin
  a model.

Exception: for small changes where delegation overhead clearly loses, the
orchestrator may implement directly on the feature branch. This trades away the
fresh-implementer perspective, so note it in the final report; the dual review
gate in phases 6-7 applies unchanged either way.

Give the implementer the frozen spec, the worktree path, and the exact
verification commands. Ask for a clean diff, not commits.

When the implementer finishes, the orchestrator must:

1. Read the full diff and judge it like a contributor PR.
2. Run the project's checks itself (look for Makefile, mise tasks, or build
   scripts) — implementer claims are advisory.
3. Send focused fixes back through the same implementer channel. After two
   failed rounds, take over and finish directly.
4. Export the result as a complete patch — stage everything in the worktree
   first so newly created files are included
   (`git add -A && git diff --binary --cached HEAD`); a plain `git diff` patch
   silently drops untracked files. Apply the complete result to the feature
   branch in the delivery checkout, verify new files landed, and confirm the
   captured user changes remain intact. Stage only the feature paths; never
   sweep unrelated delivery checkout dirt into the commit. Retain the
   implementer worktree until the final handback checks in phase 8 pass.

## 5. Commit, Push, Draft PR

Use the `commit-push-pr` skill for commit message conventions, push, PR template
detection, and PR body structure — with one override: create the pull request as
a draft (`gh pr create --draft ...`). Stage only approved feature paths with
`git add -- <feature-paths>` so tracked changes and new files are included.

If the intake baseline includes unrelated staged paths, never use a plain
`git commit`: it commits the whole index. Snapshot those paths' staged status,
index entries (`git ls-files --stage -- <paths>`), and cached binary diff.
Verify that snapshot immediately before committing, then use
`git commit --only -- <feature-paths>` or an equivalently isolated temporary
index. Immediately afterward, verify that the commit contains only feature paths
and that every unrelated path's staged status, index entry, and cached content
exactly match the snapshot. Stop before pushing if they differ. Use the same
scoped mechanism for every later fix commit while unrelated staged dirt remains.
The PR is not ready until the review gate in phases 6-7 passes.

## 6. Dual Review

Record the pushed HEAD SHA, then spawn two fresh reviewers in parallel against
that exact commit, one per engine. Dual review means:

- one fresh reviewer through the orchestrator's native subagent/task tooling;
- one reviewer through the dedicated foreign-engine review skill or CLI.

For a Codex orchestrator, use a native Codex reviewer subagent plus the
`claude-review` skill or Claude CLI. For a Claude orchestrator, use a native
Claude reviewer subagent plus the `codex-review` skill or Codex CLI. Never
review from the orchestrating session's context and call it independent. Do not
invoke the orchestrator's own CLI when native reviewer tooling is available; use
a same-engine CLI only when native tooling is unavailable or lacks a required
capability, not merely to pin a model.

Give each reviewer the same substantive prompt: the repo path, the target
(feature branch vs base), the condensed feature spec, and, for CLI channels, a
report file path. Native task results may return directly through the task
tooling. Including the spec matters — requirement mismatches are the
highest-value finding class.

```text
Review this implementation independently.

Repository: <absolute repo path>
Target: branch <feature-branch> vs <base>
Commit: <pushed HEAD SHA>
Feature spec: <condensed spec>
Report file: <absolute report path, when the channel uses one>

Look for:
- requirement mismatches against the spec
- correctness bugs and edge cases
- missing or weak tests
- security issues
- unintended behavior outside the spec

For each finding include severity, file and line reference, concrete failure
mode, and suggested fix direction. Do not edit files. Return the report through
the review channel; when a report file is provided, write it there. Name the
reviewed commit in the report. If there are no substantive findings, say so.
```

Babysit the runs: launch both in parallel, then poll native task status and the
foreign channel's process/report as appropriate. Long silences are normal — do
not kill a live run before its deadline. Give each reviewer a bounded runtime
(default 30 minutes unless the user sets another); retry a reviewer once only
after its task or process has died or the deadline has passed. If an engine's
review is still missing after the retry, continue reconciling with the coverage
you have, but the PR cannot be marked ready (see phase 8). A failed task, a
nonzero process, or an empty or missing expected report is a failed review —
inspect its error output and never treat it as clean. A result naming a
different commit than the current pushed HEAD is stale — discard it and re-run
that reviewer.

## 7. Reconcile and Fix

Reviewer reports are evidence, not authority:

1. Read both reports and verify every finding against the code before acting.
2. Weight by independence: the reviewer whose model differs from the implementer
   is the primary gate; the same-model reviewer is a secondary perspective.
3. Fix confirmed findings (directly, or through the same implementer channel),
   re-run project checks, commit, and push.
4. Re-review only the fix delta, not the whole branch, through the same two
   channels: a fresh native reviewer subagent and the foreign-engine review
   skill or CLI. Cap the loop at two fix rounds; surface anything still open to
   the user instead of looping.
5. Record dismissed findings with a one-line reason each.

## 8. Deliver

The review gate requires completed reviews from both engines. When it passes,
wait for the PR's required GitHub checks on the final pushed HEAD
(`gh pr checks --watch`, bounded at 60 minutes unless the user sets another
deadline). Route actionable CI failures back through the phase 7 fix loop — they
consume fix rounds like reviewer findings. Do not mark the PR ready yet.

Before removing any workflow-created checkout or declaring local delivery
complete, verify in the delivery checkout:

- the expected feature branch is attached there;
- its HEAD exactly equals the pushed remote branch SHA;
- upstream tracking points to the expected remote branch;
- every pre-existing staged, unstaged, and untracked change from the intake
  baseline is preserved;
- the final `git worktree list --porcelain` mapping has no unintended branch
  attachment.

Only after these checks pass, remove workflow-created implementer and temporary
orchestrator worktrees, then inspect the mapping again to confirm cleanup. The
delivery checkout itself remains the local home of the feature branch.

If handback is blocked, retain the temporary orchestrator checkout and report
its path and the exact blocker. Never remove the only checkout containing or
holding the final feature branch. The user must explicitly accept a different
final local destination before the delivery checkout can be skipped. Leave the
PR as a draft until handback succeeds or the accepted destination is verified.

Mark the PR ready with `gh pr ready` only after required checks are green and
handback plus cleanup verification has passed. If only one engine reviewed the
branch, residual findings need a user decision, CI cannot pass within scope, or
handback remains blocked, leave the PR as a draft, say why, and let the user
decide whether the achieved coverage is enough.

The final report must include:

- PR URL and target base branch.
- What shipped, and any deviations from the approved plan.
- Review outcome: findings fixed, findings dismissed (with reasons), and
  residual findings or risk.
- Verification evidence: which checks ran and their results, including the CI
  outcome for the final pushed commit.
- Local handback: delivery-checkout path, attached branch and final SHA,
  upstream status, and which pre-existing changes were preserved.
- Any retained temporary checkout, its path, and why cleanup was blocked.

## Inline CLI Fallback Shapes

Use these only for the foreign-engine channel when no dedicated review skill
covers it. A same-engine CLI is also allowed when native subagent/task tooling
is unavailable or lacks a required capability. These shapes are intentionally
minimal; dedicated review skills remain the source of truth for prompting and
verification strategy.

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ship-feature-pr.XXXXXX")"
```

Codex reviewer:

```bash
codex review - < "$ARTIFACT_DIR/codex-prompt.md" \
  > "$ARTIFACT_DIR/codex-report.md" 2> "$ARTIFACT_DIR/codex-stderr.log"
```

Claude reviewer (plan mode keeps the session read-only; safe mode keeps the
target repo's hooks and plugins from executing during the review):

```bash
claude -p --permission-mode plan --safe-mode \
  < "$ARTIFACT_DIR/claude-prompt.md" \
  > "$ARTIFACT_DIR/claude-report.md" 2> "$ARTIFACT_DIR/claude-stderr.log"
```

## Failure Handling

- One reviewer channel is unavailable: run the reviewer the available channel
  provides and report the gap. Do not fake a pair with two instances of the same
  engine — same-model redundancy adds almost nothing.
- Plan rejected: revise and re-present; do not implement around the user.
- Implementer fails twice on the same problem: take over and implement directly.
- Reviewer run fails or times out: retry once, then continue with the remaining
  reviewer and report the coverage gap.
- Single-engine coverage — for any reason — never satisfies the ready gate: the
  PR stays a draft and the user decides whether it is enough.
- Never mark the PR ready without at least one independent review of the final
  diff, including fix commits.
- Delivery-checkout handback fails: retain the temporary checkout, preserve all
  worktree mappings, and report the path and blocker instead of deleting it or
  silently choosing another destination.
