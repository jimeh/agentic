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
reconciling reviewer findings, and delivery — and delegates the typing.

Invoking this skill authorizes the branch, worktree, commit, push, and pull
request mutations the workflow requires. It never authorizes merging the PR,
deploying, or releasing; those need separate, explicit user say-so.

This skill is engine-agnostic: Claude or Codex can run it as the orchestrator.
It never assumes engine-specific tools. Where the environment provides a skill
for delegating work to the other engine (implementation or review), use that
skill; otherwise use the inline CLI shapes at the end of this document.

## Phases

1. Intake — feature description and base branch.
2. Branch — feature branch off an updated base.
3. Plan — reuse or create a plan, sanity check, user approval.
4. Implement — usually one fresh implementer in an isolated worktree.
5. Commit, push, draft PR.
6. Dual review — one Codex reviewer and one Claude reviewer, in parallel.
7. Reconcile and fix — verify findings, fix, re-review the delta.
8. Deliver — wait for CI, mark the PR ready, and report.

Do not skip phases or reorder the gates. Reusing an existing plan completes the
planning pass; it does not skip phase 3. Details below.

## 1. Intake

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

Otherwise, plan approval (phase 3) is on by default. If the user said to run
without checkpoints ("just ship it", "don't ask, go"), skip the approval stop
and note that in the final report.

Then preflight before any work: verify `gh` authentication, push access to the
remote, that the base ref exists on the remote, and that both reviewer engines
are reachable (a delegation skill or the CLI itself). Surface a missing
requirement as a blocker now instead of discovering it after implementation.

## 2. Branch

1. Confirm the working tree is clean. If unrelated uncommitted changes exist,
   stop and ask before touching them.
2. `git fetch origin <base>` so the branch starts from the current base.
3. Create a descriptive feature branch off `origin/<base>`. Follow the
   branch-naming rules in the `commit-push-pr` skill.

## 3. Plan

Start with the plan found during intake:

- If it still applies to the feature, reuse it. Do not delegate a fresh planning
  pass merely to restate or independently validate it. Ask the user directly to
  settle any unresolved product or scope choices.
- If the existing plan has stale, contradictory, or incomplete code-grounded
  assumptions, resolve them directly when straightforward. Delegate a fresh
  planning pass only when doing so requires material replanning.
- If no applicable plan exists, delegate planning for a non-trivial feature to a
  fresh instance (a planning subagent, or a headless CLI run of either engine)
  so the plan is grounded in a clean read of the code.
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

## 4. Implement

Delegate implementation to exactly one fresh implementer working in an isolated
worktree created from the feature branch. Never let an implementer edit the
orchestrator's checkout. For routing:

- If the environment provides a skill for delegating implementation to the other
  engine, and the spec is bounded and mechanical, use it.
- Otherwise use a fresh subagent or headless CLI instance in the worktree.

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
   silently drops untracked files. Apply it onto the feature branch, verify new
   files landed, and only then remove the worktree.

## 5. Commit, Push, Draft PR

Use the `commit-push-pr` skill for commit message conventions, push, PR template
detection, and PR body structure — with one override: create the pull request as
a draft (`gh pr create --draft ...`). The PR is not ready until the review gate
in phases 6-7 passes.

## 6. Dual Review

Record the pushed HEAD SHA, then spawn two fresh reviewers in parallel against
that exact commit, one per engine:

- One Codex / gpt-5.6-sol reviewer.
- One Claude reviewer.

For the other engine, use the environment's review-delegation skill when
present; for the orchestrator's own engine, spawn a fresh instance (subagent or
headless CLI) — never review from the orchestrating session's context and call
it independent. Fall back to the inline CLI shapes below when no skill is
available.

Give each reviewer the same prompt: the repo path, the target (feature branch vs
base), the condensed feature spec, and a report file path. Including the spec
matters — requirement mismatches are the highest-value finding class.

```text
Review this implementation independently.

Repository: <absolute repo path>
Target: branch <feature-branch> vs <base>
Commit: <pushed HEAD SHA>
Feature spec: <condensed spec>
Report file: <absolute report path>

Look for:
- requirement mismatches against the spec
- correctness bugs and edge cases
- missing or weak tests
- security issues
- unintended behavior outside the spec

For each finding include severity, file and line reference, concrete failure
mode, and suggested fix direction. Do not edit files. Write the report to the
report file and name the reviewed commit in it. If there are no substantive
findings, say so.
```

Babysit the runs: launch both in the background, then poll both the report files
and process liveness. Long silences are normal — do not kill a live run before
its deadline. Give each reviewer a bounded runtime (default 30 minutes unless
the user sets another); retry a reviewer once only after its process has died or
the deadline has passed. If an engine's review is still missing after the retry,
continue reconciling with the coverage you have, but the PR cannot be marked
ready (see phase 8). A run that exits nonzero or leaves an empty or missing
report has failed — read its stderr log and treat it as a failure, never as a
clean review. A report naming a different commit than the current pushed HEAD is
stale — discard it and re-run that reviewer.

## 7. Reconcile and Fix

Reviewer reports are evidence, not authority:

1. Read both reports and verify every finding against the code before acting.
2. Weight by independence: the reviewer whose model differs from the implementer
   is the primary gate; the same-model reviewer is a secondary perspective.
3. Fix confirmed findings (directly, or through the same implementer channel),
   re-run project checks, commit, and push.
4. Re-review only the fix delta, not the whole branch. Cap the loop at two fix
   rounds; surface anything still open to the user instead of looping.
5. Record dismissed findings with a one-line reason each.

## 8. Deliver

The review gate requires completed reviews from both engines. When it passes,
wait for the PR's required GitHub checks on the final pushed HEAD
(`gh pr checks --watch`, bounded at 60 minutes unless the user sets another
deadline). Route actionable CI failures back through the phase 7 fix loop — they
consume fix rounds like reviewer findings. Mark the PR ready with `gh pr ready`
only once the required checks are green. If only one engine reviewed the branch,
residual findings need a user decision, or CI cannot pass within the approved
scope, leave the PR as a draft, say why, and let the user decide whether the
achieved coverage is enough.

The final report must include:

- PR URL and target base branch.
- What shipped, and any deviations from the approved plan.
- Review outcome: findings fixed, findings dismissed (with reasons), and
  residual findings or risk.
- Verification evidence: which checks ran and their results, including the CI
  outcome for the final pushed commit.

## Inline CLI Fallback Shapes

Use these only when no delegation skill covers the reviewer. They are
intentionally minimal; the dedicated review skills remain the source of truth
for prompting and verification strategy.

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

- One engine's CLI is unavailable: run the single reviewer the available engine
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
