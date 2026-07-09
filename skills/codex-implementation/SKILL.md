---
name: codex-implementation
description: >-
  Delegate bounded implementation work to Codex CLI / gpt-5.6-sol and then
  have Claude inspect, verify, and deliver the result where the work belongs.
  Use when the user asks Claude to have Codex or gpt-5.6-sol implement code,
  when model-routing calls for Codex implementation, or when a scoped task is
  well-defined, mechanically implementable, independently verifiable, and
  unlikely to require architectural, product, API, or UX judgement. Do not use
  for planning, architecture, exploratory debugging, ambiguous requirements,
  product decisions, UX decisions, or open-ended features.
---

# Codex Implementation

Use Codex as a bounded implementation agent. Claude keeps ownership of planning,
architecture, decomposition, validation, integration, and user communication.

Do not hand Codex an entire project or vague feature. Split the work first.

## Delegation Checklist

Use Codex when nearly all answers are yes:

1. Is the scope clearly bounded?
2. Is there a concrete success criterion?
3. Can the work be completed without architecture, product, API, or UX
   decisions?
4. Can the result be independently reviewed?
5. Would an isolated worktree reduce conflict or risk?

If not, retain the work, decompose it further, or use a planning/review skill
first.

Good candidates:

- Implementing an approved plan
- Straightforward refactors
- Migrations
- Adding tests
- Implementing a documented API
- Fixing a well-understood bug
- Repetitive edits or pattern conversions
- Updating generated or mechanical code

Bad candidates:

- Architecture or API design
- UX or product decisions
- Unclear failures
- Exploratory work
- Ambiguous requirements
- Broad features with unknown scope

## Workflow

1. Inspect the current state with `git status --short`.
2. Define the task: objective, constraints, files if known, success criteria,
   and verification.
3. Use an isolated worktree for non-trivial edits, risky edits, or parallel
   work.
4. Create a temporary artifact directory for the prompt and report.
5. Write a concise prompt.
6. Run `codex exec` with workspace write access in the intended checkout.
7. Inspect `git status` and `git diff`.
8. Run or check focused verification yourself.
9. For non-trivial changes, review the diff yourself as an independent reviewer
   before treating the work as complete — judge it like a contributor PR. Do not
   route the diff to `codex-review`: gpt-5.6-sol re-reviewing its own output is
   weak independence. For substantial diffs, also get a fresh Claude subagent
   review; the orchestrating session wrote the spec and is not fully neutral.
   This gate is mandatory; adjust or reject the result based on what it finds.
10. Deliver the result (see Delivery below).
11. Report what changed, what was verified, and what remains.

## Isolation

Use isolated work when practical:

- Create a dedicated worktree and branch for substantial or parallel tasks.
- Keep Codex away from unrelated user changes.
- Ask Codex to return a patch or clean diff, not commits, unless commits were
  explicitly requested.
- Do not let multiple implementation agents edit the same checkout.

Use the current checkout only for small, low-risk edits where isolation adds
more overhead than value.

## Isolated Worktree Command Shape

Prepare artifacts:

```bash
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/codex-implementation.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
REPORT="$ARTIFACT_DIR/report.md"
```

Create a throwaway worktree from the current `HEAD`:

```bash
TASK_SLUG="<short-task-slug>"
WORKTREE_PARENT="$(mktemp -d "${TMPDIR:-/tmp}/codex-worktree.XXXXXX")"
WORKTREE_DIR="$WORKTREE_PARENT/worktree"
BRANCH="codex/$TASK_SLUG"

git worktree add -b "$BRANCH" "$WORKTREE_DIR" HEAD
```

Run Codex in that worktree:

```bash
codex exec \
  -C "$WORKTREE_DIR" \
  --add-dir "$ARTIFACT_DIR" \
  -s workspace-write \
  -o "$REPORT" \
  - < "$PROMPT"
```

Run notes, for any `codex exec` invocation in this skill:

- Append `2>/dev/null` to suppress Codex's progress noise on stderr; drop it
  only to debug a failing run. The `-o` report file holds the result.
- For long tasks, run in the background and read the `-o` report when the run
  exits. Do not kill quiet runs prematurely; long silences are normal.
- Parallel independent tasks are fine: separate worktrees, separate `-o` files.

After Codex finishes, inspect the result from the worktree:

```bash
cd "$WORKTREE_DIR"
git status --short
git diff
```

If the implementation depends on uncommitted work in the original checkout,
either keep the task in the current checkout or explicitly transfer only the
needed patch/context into the worktree. Do not accidentally copy unrelated user
changes.

## Delivery

The orchestrating session owns delivery. Decide how the verified result should
land based on the work it belongs to: fold it into the checkout or branch where
a larger task is being assembled, commit it on its own branch and offer a pull
request, or hand back a patch. The delegation mechanics (worktree or not) do not
dictate the destination.

Two constraints always hold:

- Do not push, open a PR, or integrate into the user's checkout or main branch
  without the user's say-so.
- A human reviews the work before it ships; for standalone changes that usually
  means a pull request.

To apply a worktree result onto another checkout:

```bash
(cd "$WORKTREE_DIR" && git add -A &&
  git diff --binary --cached HEAD) > "$ARTIFACT_DIR/change.patch"
git apply "$ARTIFACT_DIR/change.patch"
```

Staging inside the throwaway worktree is required so newly created files are
included in the patch; `git diff HEAD` alone would drop them.

## Cleanup

Once the result is delivered (or the work is abandoned), remove the throwaway
checkout so worktrees and branches do not accumulate:

```bash
git worktree remove "$WORKTREE_DIR"
rm -rf "$WORKTREE_PARENT" "$ARTIFACT_DIR"
```

Delete the local `codex/<slug>` branch once it is merged or rejected. Keep the
branch while a PR based on it is still open.

## Current Checkout Command Shape

Use this only for small, low-risk edits:

```bash
codex exec \
  -C "$PWD" \
  --add-dir "$ARTIFACT_DIR" \
  -s workspace-write \
  -o "$REPORT" \
  - < "$PROMPT"
```

Use `danger-full-access` only when the implementation truly needs machine-level
access such as simulator control, app automation, package-manager global state,
or files outside the workspace.

## Iteration

Follow-up fixes are cheaper through the same Codex session than a fresh
zero-context run, and keep the context Codex already built. `codex exec resume`
accepts `-o` and `-c` config overrides but not `-C` or `-s`, so run it from the
target checkout and set the sandbox through config:

```bash
(cd "$WORKTREE_DIR" && codex exec resume --last \
  -c sandbox_mode="workspace-write" \
  -o "$REPORT" \
  - < "$PROMPT")
```

Write the follow-up prompt to a fresh file first; state only what is wrong and
what proof is expected. With parallel Codex runs in flight, resume by session id
instead of `--last`. If two resume rounds fail to fix the problem, stop
delegating and make the fix directly.

## Prompting Strategy

Prompts should be short and operational. Include only what changes the outcome:
objective, constraints, known files, and success criteria. Avoid large context
dumps and architecture essays.

Use this shape:

```text
Implement this scoped change.

Repository: <absolute repo path>
Objective: <one sentence>

Constraints:
- <public APIs unchanged | do not alter behavior | preserve user changes>
- Do not commit, push, deploy, or edit global config.
- Stop if architecture, API, UX, or product decisions are required.

Files to inspect first:
- <paths if known>

Success criteria:
- <observable behavior or testable outcome>

Verification:
- Run <focused command>, or explain why it cannot run.

Report:
- Summary
- Files changed
- Important decisions
- Assumptions
- Verification run and result
- Limitations or suggested follow-up
```

Examples:

```text
Implement the approved plan for the authentication middleware.
Keep public APIs unchanged. Add tests. Return when complete.
```

```text
Refactor the cache implementation to remove duplicate logic.
Do not change behavior. Update tests if required. Return a summary of changes.
```

## Scope Control

- If the task grows beyond the original scope, stop and recommend a split.
- If architectural issues appear, return them to Claude. Do not redesign the
  system independently.
- If requirements are missing, report the gap and recommended next step.
- If repeated failures happen, explain the blocker. Do not retry the same
  approach indefinitely.
- Preserve unrelated user changes.

## Reporting Back

After Codex finishes, Claude must inspect the result before presenting it.

Report:

- What Codex changed
- Files changed
- Verification run and result
- Any Claude adjustments after review
- Assumptions, limitations, or follow-up work

If Codex was blocked, report why, what information is missing, and the next
recommended step.
