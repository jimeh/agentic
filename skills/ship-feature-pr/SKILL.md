---
name: ship-feature-pr
description: >-
  Take a feature end to end into a reviewed pull request: plan, implement,
  commit, push, open a draft PR, run independent Claude and Codex reviews,
  reconcile findings, wait for CI, mark it ready. Not for tiny edits, or for
  commit-only, PR-only, or review-only requests.
---

# Ship Feature PR

Take a feature from request to reviewed, ready pull request. The orchestrator
owns judgement, state safety, integration, review reconciliation, and delivery.
Delegate implementation and independent review where those perspectives add
value.

Invoking this skill authorizes the branch, worktree, commit, push, and pull
request mutations needed by the workflow, along with the implementer and
reviewer agents it names. It does not authorize merging, deploying, or
releasing.

## Core Contracts

### Delivery checkout ownership

Treat the checkout active when the skill is invoked as the **delivery
checkout**. Use it to integrate the finished implementation, create and hold the
feature branch, commit, push, and create the pull request. It remains the final
local home of the branch.

Being detached, linked, or outside the root worktree is not by itself a reason
to relocate delivery. Use another orchestrator checkout only when a concrete Git
or environment constraint makes the delivery checkout unsafe. Treat that
checkout as temporary and retain it until handback succeeds or the user accepts
another final destination.

### Engine routing

Use native subagent or task tooling for same-engine planning, implementation,
and review. Use a dedicated cross-engine skill or CLI for work that requires the
other engine. For example, a Codex orchestrator uses a native Codex reviewer and
the Claude review channel; a Claude orchestrator does the reverse.

Do not invoke the orchestrator's own CLI merely for isolation or model pinning
when native tooling is available. A same-engine CLI is a fallback only when
native tooling is unavailable or lacks a required capability.

Explicit user instruction may override the implementer engine. When it does,
keep both review channels and weigh the reviewer independent of the implementer
most heavily, as in step 7.

### Test quality

Use the strongest proportionate evidence for each material feature behavior.
Automated tests are usually the best evidence for logic, explicit error
handling, boundaries, and regressions when a stable harness exists, but they are
not required for every touched line or low-risk presentation, configuration,
generated-artifact, or mechanical change. Planner, implementer, orchestrator,
and both reviewers hold the same acceptance bar, but they do not each regenerate
the same evidence.

When adding or changing tests:

- Cover the material successful, failure, boundary, and regression scenarios
  justified by concrete failure modes, not every permutation.
- Assert observable behavior rather than implementation shape. Mock external
  boundaries only where needed, never the behavior under test. Do not let
  timing, ordering, caching, or the environment make a broken implementation
  look covered.
- Prefer a test-first failure at the intended assertion. When the implementation
  already exists, require targeted negative evidence only when the behavior is
  material and inspection cannot rule out a false-positive test. One
  representative perturbation can cover a behavioral cluster; obvious direct
  assertions and trivial tests do not need one.
- Confirm that each new test ran by name or count. A green existing suite shows
  only that covered behavior did not regress; it does not prove new behavior is
  adequately tested.

Choose which scenarios need explicit automated coverage by risk, regression
likelihood, repository policy, and harness stability. Ground lighter coverage in
the specific code — what it can do wrong and what other evidence would notice —
rather than effort or confidence. Thin existing tests increase the cost of good
coverage but do not automatically require a new harness. Building the first
useful scaffolding is in scope when the feature's risk justifies it;
back-filling unrelated coverage is not.

When automated tests are not proportionate, record the alternative static,
build, runtime, or manual evidence and any meaningful residual risk. Keep the PR
draft and obtain explicit user acceptance only when a material risk remains
unclosed, not merely because no test was added.

### Evidence ownership

Assign each kind of evidence once:

- The implementer owns focused test execution, targeted negative evidence when
  warranted, and affected local checks while building the feature.
- The orchestrator owns evidence sufficiency. Inspect the implementation and
  fill only missing, ambiguous, or invalidated evidence; do not automatically
  repeat trusted implementer commands.
- Reviewers own independent reasoning about requirements, code, and test
  quality. They inspect first and run only focused reproducers needed to verify
  concrete findings, not broad suites or CI-equivalent checks.
- CI owns clean-environment, cross-platform, and repository-wide gates it
  actually runs.

Keep a compact evidence ledger through the workflow. For each result record the
captured revision, command, focused or broad scope, outcome and test count or
names where applicable, behavior or failure path proved, negative-evidence
result where applicable, and environment limitations. Evidence carries forward
when its revision is an ancestor of the new head and the intervening delta
cannot affect what it proves. Classify every correction before deciding what it
invalidates.

### Context continuity

Use fresh agents for independent initial perspectives. Reuse the implementer for
focused corrections and reuse the original reviewers for fix verification when
their sessions can continue. Fresh reviewers are fallbacks for unavailable or
invalid continuations, or for changes that materially broaden the reviewed
scope.

## Workflow

### 1. Intake

Before changing local state, record enough of the delivery checkout to verify it
later:

- invocation path, repository root, branch or detached state, and current head;
- whether it is the root or a linked worktree and the current worktree mapping;
- a `git status --porcelain` snapshot of staged, unstaged, and untracked
  changes.

The workflow needs a delivery checkout holding nothing unrelated to the feature.
Classify whatever the snapshot reports:

- Ignored paths are invisible to the workflow. Never commit or remove them.
- Changes that are plainly the plan or spec for the feature about to ship —
  typically produced by the planning discussion that led here — belong to it.
  Commit them onto the feature branch in step 3 and disclose that in the final
  report.
- Anything else stops the workflow. Show the user what is there and ask whether
  it belongs to the feature or the run should stop so they can commit or stash
  it themselves. There is no third answer; the workflow does not carry unrelated
  uncommitted work through branch moves, commits, and pushes.

Do not stash, discard, or normalize pre-existing work to start the workflow. A
repository that does not track plan documents should ignore them, which puts
them in the first bucket.

Establish the requested change and target base branch. Use the remote default
branch when the user did not specify one, and state the assumption. Find the
latest applicable plan in the conversation or referenced documents and decide
whether it is settled, provisional, stale, or incomplete. A plan the user has
already approved, including a completed planning discussion followed by this
skill invocation, is settled and needs no second approval.

Verify repository access, the remote base, and both required review channels
before mutation. Select the native same-engine channel when possible and its
allowed fallback otherwise. Missing native tooling alone is not a blocker;
missing both same-engine options or the foreign reviewer is.

Set a post-draft correction-cycle budget. Default to two cycles; choose a higher
limit only when the user or repository requires it, or when declared risk
justifies it before review starts.

Decide whether an external pull-request reviewer should participate. It is not
part of the default workflow: the two internal engine perspectives remain the
required independent review. Recommend an external reviewer for complex, large,
architectural, security-sensitive, authorization, data or persistence,
concurrency, lifecycle, multi-platform, or otherwise broad changes, and ask the
user once whether to include it. For smaller features, deliver the internally
reviewed PR first and mention that the user can request an external review
afterward. A repository policy or an explicit user request makes the external
review required.

When an external reviewer is selected, identify its provider-specific skill or
repository guidance before invoking it. This skill owns when external review is
useful and how its findings enter the correction loop; the provider-specific
workflow owns triggering, thread handling, and review-state closure.

### 2. Plan

Reuse a settled plan when it still matches the request. Resolve small,
code-grounded gaps directly. Replan only when the existing approach is
materially stale or incomplete.

When no applicable plan exists, use a fresh native planning agent for a
non-trivial feature and plan directly for an obvious small change. Ask the user
to settle unresolved product or scope choices. Unless the user already granted
autonomy, obtain approval for a provisional plan before implementation. If the
user rejects a plan, revise and re-present it rather than implementing around
the feedback.

Sanity-check the plan against the actual code before freezing it.

Map the existing tests and other verification signals for the areas the feature
will touch: what they prove, which material failure modes remain exposed, and
whether they would catch a regression. This informs the approach; it is not a
mandate to repair what is there. Where the baseline is thin or absent, decide
whether the feature's risk justifies fixtures, a harness, or the first test file
for a module, or whether focused static, build, runtime, or manual evidence is
more proportionate. Put that choice and its cost in the plan. Record unrelated
test debt as a non-goal.

Freeze the result into a concise implementation spec. Link to canonical behavior
and architecture sources instead of copying them. Cover the objective,
constraints, expected file scope, success criteria, risks, and non-goals. Add a
closure matrix for each material observable behavior and material failure path,
boundary, regression risk, and supported-platform concern: name the
proportionate test or other evidence that closes it, or mark it as an accepted
non-goal. Identify exact focused commands and intended-final-head gates,
including which gates CI supplies. Identify scope early enough to compare it
with the captured dirty state before moving branches or integrating work.

### 3. Prepare the Delivery Branch

Prefer keeping all orchestration in the delivery checkout. Refresh and verify
the remote base before creating the delivery branch or moving the checkout onto
it. Reuse an existing feature branch only when its base and commits belong to
the requested work; otherwise create a clean branch there or ask if local state
makes that unsafe. A detached checkout at the intended base is a valid place to
create the branch.

Commit the plan or spec file the intake gate assigned to the feature here, as
its own commit, before any implementer worktree exists. The worktree is created
from this tip and therefore contains it, so the spec can point the implementer
at the path rather than inlining the content.

If a separate orchestrator checkout is genuinely necessary, record its path and
reason. Never remove it while it is the only safe local home of the feature
branch.

### 4. Implement and Integrate

For non-trivial work, delegate to one fresh same-engine implementer in a
separate worktree, preferring native tooling and using the allowed same-engine
CLI fallback only when necessary. Keep that agent away from the delivery
checkout. Direct implementation there is acceptable when the change is small
enough that delegation would add more cost than perspective; disclose that in
the final report.

Create the worktree on its own branch off the current feature branch tip. Git
refuses to check out a branch that is already checked out elsewhere, so the
implementer cannot attach to the delivery branch by accident:

```bash
git worktree add -b impl/<slug> "$WORKTREE_DIR" <feature-branch>
```

Give the implementer the frozen validation strategy and exact verification
commands. Require it to use the selected evidence as a running check while it
works rather than a step at the end. When tests are planned, prefer test-first
failures at the intended assertion and require the implementer to report the new
test names or counts; when tests are not proportionate, require the named
alternative evidence and residual risk. Tell it to leave Git alone and simply
report what it did; the orchestrator owns every Git operation, including
committing the work in the implementer's own worktree. Depending on a delegated
agent to commit is what makes uncommitted work vanish silently later. Require
the implementer to return the completed closure matrix and compact evidence
ledger.

When it finishes:

1. Capture its work before inspecting it. Read what it reported doing, then
   account for every path the worktree reports:

   ```bash
   cd "$WORKTREE_DIR"
   git status --porcelain
   ```

   Resolve unexplained paths with the implementer. Delete strays or ignore
   genuine build artifacts where the repository should already do so, then
   sweep:

   ```bash
   git add -A && git commit -m "impl: <slug>"
   ```

   Fix the worktree rather than narrowing the staging set. Untracked strays
   survive resets and can affect tests; a complete worktree makes `git add -A`
   safe for new files, renames, and deletions. Nothing to commit is valid if the
   implementer committed; the branch tip is what matters.

2. Review the complete result as a contributor diff, tests included, without
   leaving the delivery checkout:

   ```bash
   git diff <feature-branch>...impl/<slug>
   git log --stat <feature-branch>..impl/<slug>
   ```

   For each substantive behavior it adds, identify the test or other evidence
   that closes its material success and failure modes. Judge what you find
   against the test-quality contract; a material unexplained risk is a
   correction, not a note.

3. Bind the implementer's evidence to the captured commit, then inspect the
   closure matrix and runner output. Confirm that each new test ran by name or
   count. Run only missing, ambiguous, or invalidated focused checks yourself;
   do not repeat broader checks that valid evidence or CI will supply.

   Do not perturb every new test. A test-first failure at the intended assertion
   is sufficient negative evidence. When no such failure exists, first inspect
   the test and implementation. Perturb one representative behavior only when it
   is material and indirect wiring, complex mocks, async timing, caching,
   generated output, or similar factors leave a credible risk that the test
   would pass over broken behavior. Obvious direct assertions and trivial tests
   need no mutation.

   When a targeted perturbation is warranted, perform it in the disposable
   worktree and require failure at the intended assertion:

   ```bash
   cd "$WORKTREE_DIR"
   <break one behavior under test>
   <the spec's focused test command>   # must fail, at its assertion
   git checkout -f impl/<slug>         # restored exactly
   ```

   A build or import failure does not prove behavior; narrow the perturbation
   and retry. If the test passes, check that the run rebuilt the changed source.
   Restore the implementation, verify the worktree matches the captured commit,
   and rerun the focused test. Do not repeat valid implementer perturbations or
   perform multiple mutations for the same behavioral cluster. Inspect
   assertions and mocks for the remaining test-quality judgment.

4. Send focused corrections back through the same implementer session. It
   continues in the same worktree; do not reset it here, because nothing has
   been integrated yet and the reset target is still the pre-implementation tip,
   which would discard the very work being corrected. Capture each round with
   step 1 as it finishes. Take over after two unsuccessful correction rounds.

5. Integrate from the delivery checkout:

   ```bash
   git merge-base --is-ancestor <feature-branch> impl/<slug>
   git merge --squash impl/<slug>
   ```

   If the ancestry check fails, reconcile stale work before squashing.

`merge --squash` stages the complete result — new files, renames, and deletions
included — without committing.

Never `git add -A` or `git commit -a` in the delivery checkout. The staged
squash result is the feature scope. Keep the implementer worktree and branch
until delivery is verified in step 8.

### 5. Commit, Push, and Open the Draft PR

Use the `commit-push-pr` skill for commit conventions, push behavior, template
detection, and PR copy, but create the pull request as a draft.

Commit the staged squash result. The intake gate and the staging rule in step 4
already bound the scope, so no per-commit exclusion logic is needed: confirm
`git status` shows nothing unexpected staged, that new feature files were
included, and that nothing outside the feature was swept in.

Push and create the pull request from the delivery checkout. The PR remains a
draft until review, CI, and local delivery all pass.

Immediately read the PR back and verify its title, body, base, head, and draft
state. Start initial CI and both reviews concurrently. Initial CI is useful
feedback, but it is a delivery gate only if this remains the intended final
head.

### 6. Run the Initial Dual Review

Run two fresh reviewers in parallel against the pushed feature state:

- one through the orchestrator's native same-engine channel;
- one through the dedicated foreign-engine review channel.

For CLI-backed foreign review, use `claude-review` or `codex-review` as
appropriate and follow its read-only safety guidance. Preserve a resumable
session when this workflow expects reviewer continuity.

Give both reviewers the repository, target base and feature state, a condensed
implementation spec, and the evidence ledger. Give an explicit execution policy:
inspect first; do not run broad suites, builds, lint, or CI-equivalent checks
already covered by valid evidence. Allow a focused reproducer only to verify a
concrete suspected defect, and require the reviewer to report it. Ask reviewers
to inspect for requirement mismatches, correctness problems, edge cases,
security issues, and unintended behavior. Require each finding to state its
severity, location, concrete failure mode, and suggested direction, and require
reviewers to say explicitly when they find no substantive issues. Keep prompts
compact; do not paste large diffs, logs, reports, or path lists.

Require a separate, explicit verdict on validation and tests from both
reviewers, returned even when they have nothing else to report: whether the
evidence is proportionate to the change's risk; which material successful,
failure, boundary, or regression scenarios remain unclosed; whether absent
automated coverage creates meaningful residual risk; and, for tests that were
added or changed, whether they assert observable behavior or could pass over a
broken implementation because of mocking, nondeterminism, or indirect wiring. An
absent or perfunctory verdict makes the review incomplete; ask for it rather
than accepting the result.

Keep each review read-only and retain any session handle that allows later
continuation. Accept a result only after the review completed successfully and
clearly identifies the pushed revision it covered. Ensure retries cannot be
mistaken for or consume output from an earlier attempt.

Before launching reviews, set a finite attempt budget and a context-appropriate
overall deadline. Check task or process liveness before retrying, and do not
treat quiet output as failure while a review remains live.

Both engine perspectives are required for the ready gate; do not simulate dual
review with two reviewers from the same engine. If a channel remains unavailable
when its budget or deadline is exhausted, continue with the evidence available
but leave the PR draft and report the coverage gap.

### 7. Reconcile, Fix, and Re-review

Reconcile both reviews into a single list before changing anything: fold
duplicate findings together, and settle any disagreement against the code
yourself so the implementer gets settled work rather than a conflict. Acting on
whichever review returns first sends it down a path the other may contradict.
Batch all confirmed findings into one settled correction list and normally
produce one push for the cycle.

Treat reviewer findings as evidence, not authority. Verify each one against the
code, weigh the reviewer independent of the implementer most heavily, and record
concise reasons for dismissals.

Treat a confirmed material validation gap as a finding like any other: close it,
or put it to the user for explicit acceptance. Do not silently reclassify it as
residual risk. Add a regression test for a confirmed material behavioral or
correctness failure when a stable harness makes that proportionate; otherwise
record the alternative evidence and why it closes the risk. Record a finding
that merely rediscovers an unclosed plan row as a pre-review completeness miss.

Classify the correction list as production behavior, public contract, tests or
CI fixtures only, documentation only, or material scope expansion. Use that
classification to invalidate only affected evidence and select focused checks,
negative-evidence work, and reviewer scope.

Choose correction verification by risk and by which accepted reasoning the delta
invalidates, not by raw line count:

1. **Orchestrator verification** — use for documentation, hygiene, test-only,
   mechanical, or otherwise obvious low-risk corrections that do not change
   production behavior or invalidate either reviewer's reasoning. Inspect the
   delta and run the focused evidence it affects; prior reviewer acceptance
   carries forward.
2. **Focused reviewer verification** — use when a localized correction changes
   production behavior or closes a subtle finding, but its effects remain within
   one reviewer's finding or expertise. Resume only that original reviewer and
   ask it to verify the finding and affected delta.
3. **Dual reviewer verification** — use when a correction changes architecture,
   a public contract, security or authorization, data or persistence,
   concurrency, lifecycle, supported-platform behavior, materially expands
   scope, or otherwise invalidates both reviews. Resume both reviewers, or use
   fresh reviewers when the scope is no longer a continuation.

Apply the same tiers to corrections prompted by an external reviewer. The
external reviewer can be the focused reviewer when its own technical finding
needs confirmation, but do not automatically re-run every reviewer after every
push. Technical verification and pull-request review-state closure are separate
questions: a provider may still need to revisit a small fix to clear a blocking
decision even when orchestrator verification is sufficient for confidence.

Fix confirmed findings through the same implementer session when practical.
Unlike the correction rounds inside step 4, a round here follows work that
already landed, so reset the worktree onto the delivery tip before re-prompting:

```bash
cd "$WORKTREE_DIR"
git reset --hard <feature-branch>   # attached: moves impl/<slug> on purpose
```

Sequence it yourself — integrate and commit the previous round, then reset, then
re-prompt — so the implementer works from the state that actually landed,
including any adjustment made during review. The reset is safe because you
committed its work in step 1 rather than relying on it to do so. Capture,
inspect, and integrate as in step 4, run only the verification tier selected by
the classification, then commit and push once from the delivery checkout.

For a focused or dual re-review, give each resumed reviewer its last reviewed
revision, the new verified remote tip, and concise summaries of the relevant
findings. When the reviewed revision is an ancestor of the new tip, have it
inspect only the intervening delta and affected paths; unchanged review coverage
carries forward. Do not paste generated diffs, long path lists, or prior reports
into the prompt.

Require each continued review to complete successfully and identify the new tip
it covered. If continuation is unavailable or invalid, use a fresh reviewer
through the same engine channel. If the fixes materially expand or invalidate
the accepted scope, use fresh reviewers for both channels. Preserve the other
channel's accepted coverage when the classification did not invalidate it.

Count each post-draft correction push as one cycle. Do not wait for or debug CI
on a head another planned correction will supersede. When material user-directed
scope is added after an accepted head, explicitly re-baseline the validation
matrix and cycle budget or offer a follow-up PR; do not count it silently as a
review correction. At the configured ceiling, keep the PR draft and surface a
decision: split or narrow the PR, accept documented residual risk, or explicitly
authorize another cycle.

### 8. Deliver

Declare the intended final head. Run affected broader local checks and
repository gates once on that head, excluding checks CI genuinely duplicates
unless repository policy requires a local run. For multi-platform repositories,
preflight platform-gated fixtures, filesystem assumptions, and path or error
rendering against the complete CI matrix.

Wait for required CI covering the final pushed state; ignore earlier heads.
Route actionable failures through the bounded fix and review loop. Do not make
the final ready transition before local delivery is complete.

If an external reviewer was selected or required, invoke it once on an
internally accepted candidate after the initial dual review and relevant local
validation. Do not trigger it automatically on every push. Reconcile its
findings through step 7 and charge every resulting post-draft push to the same
correction-cycle budget. Follow its provider-specific skill or repository rules
for invocation, unresolved threads, rereview, and clearing a blocking review
decision. Do not mark the PR ready while a required external review remains
blocking; clear it through reviewer acceptance or an explicitly authorized
administrative action.

Before cleanup, verify in the delivery checkout that:

- the expected feature branch is attached there;
- its head matches the pushed remote branch and tracks the expected upstream;
- nothing unexpected remains in the working tree: compare against the intake
  snapshot and account for anything new;
- the worktree mapping contains no unintended branch attachment.

Only then remove workflow-created worktrees and branches:

```bash
git worktree remove "$WORKTREE_DIR"
git branch -D impl/<slug>
```

Verify the mapping again. `-D` is required after squash integration. If handback
is blocked, retain the checkout holding the feature branch, keep the PR draft,
and report the blocker. Use another final destination only with explicit user
acceptance.

Mark the PR ready only when initial dual-review coverage plus the selected
verification tier covers every later delta, proportionate verification evidence
explains confidence, material gaps are closed or accepted, any selected or
required external review is non-blocking, required CI is green on the intended
final head, and handback and cleanup are safe. Otherwise keep it draft.

Report the PR URL and base, what shipped and any deviations from the approved
plan, review decisions, new and changed tests where applicable, alternative
verification evidence, focused and final-head check results and CI, any accepted
gaps or residual risk, final checkout, branch, revision and upstream, and
preserved changes. Add telemetry: time to draft, correction cycles and pushed
heads, obsolete CI waves, pre-review completeness misses, orchestrator-only
versus focused versus dual correction verification, external-review invocations,
and final-gate sources.
