---
name: ship-feature-pr
description: >-
  Orchestrate an explicitly requested feature from clarified intent and a
  chosen base branch through isolated planning and implementation, local
  verification, intentional commit and push, pull request creation, independent
  Claude and Codex reviews, remediation, and GitHub CI. Use only when the user
  invokes ship-feature-pr or explicitly asks for this complete end-to-end
  feature PR workflow. Do not use for ordinary coding, planning, review,
  commit, push, or pull request requests, or when the user wants only part of
  the workflow.
---

# Ship Feature PR

Coordinate the workflow and remain the final judge. Keep one implementation
writer and treat every delegated report as evidence to verify.

Invocation authorizes the branch, worktree, commit, push, and pull request
mutations inherent in this workflow. It never authorizes merging, deploying,
releasing, or unrelated external changes; require separate user authorization
for those actions.

## Workflow

1. Establish the requested change and PR base. Ask only for missing information
   and offer the remote default branch as the base default. Clarify acceptance
   criteria that materially affect scope before continuing.
2. Preflight the repository and GitHub remote. Verify the remote base ref, fetch
   access, push access, pull request authentication, project instructions,
   required CLIs, clean-context planning and implementation agents, and
   capabilities to obtain independent Claude and Codex reviews. Treat a missing
   required role as a blocker.
3. Fetch the remote base without modifying the user's checkout. Generate a
   descriptive `codex/<feature-slug>` branch name, adding a short unique suffix
   on collision rather than reusing an unrelated branch. Create the branch from
   the fetched remote base in a temporary worktree outside the repository.
   Record the repository, base ref and SHA, branch, worktree path, and starting
   SHA for recovery.
4. Give a clean-context planning agent the request, worktree, repository
   instructions, and base. Require it to inspect the actual code without edits
   and return scope, acceptance criteria, implementation steps, tests, risks,
   explicit non-goals, and unresolved decisions.
5. Verify the plan and present it for user approval. Skip this pause only when
   the user explicitly requested uninterrupted or autopilot execution and the
   plan contains no unresolved product, API, architecture, security, or UX
   decision. Stop for any material decision instead of guessing. Freeze the
   approved result into a temporary implementation spec containing the
   objective, constraints, intended files, non-goals, acceptance criteria, and
   exact verification commands. Give every downstream role the same spec.
6. Give the approved plan to one clean-context implementation agent. Make it the
   sole writer in the feature worktree; require focused verification and forbid
   commits, pushes, PR operations, and unrelated external mutations. Keep the
   same agent for corrections when possible. If it becomes unavailable,
   explicitly end its writer role before assigning one replacement; never allow
   overlapping writers.
7. Inspect the complete worktree status and diff. Preserve unrelated work,
   confirm the implementation matches the approved plan, and run check-only
   forms of the project-appropriate format, lint, type, test, build, or other
   required gates. Return verified defects to the implementation agent and
   recheck the result. Allow at most three pre-publication correction attempts;
   stop sooner if the same local failure class repeats without measurable
   progress.
8. Search the standard PR-template locations: `pull_request_template.md`,
   `docs/pull_request_template.md`, `.github/pull_request_template.md`, and
   Markdown files under `.github/PULL_REQUEST_TEMPLATE/`, accepting filename
   case variants. Use an obvious default or applicable feature template. If
   multiple templates are equally applicable, ask the user which to use.
   Preserve required headings and checklists; when none exists, draft a concise
   custom body. Commit only the intended feature changes using repository
   conventions, push the feature branch, and open a draft PR against the
   selected base. Describe the full branch diff, lead with purpose, and report
   only checks actually run. Keep it draft until every delivery gate passes.
9. Record the pushed HEAD. Start two concurrent, independent, read-only reviews
   of that exact commit: one performed by Claude and one by Codex. Give both the
   frozen implementation spec and the same review target. Ask both to check
   requirement mismatches, correctness, edge cases, missing or weak tests,
   security issues, and unintended behavior outside the spec. Require each
   report to name its reviewer identity and reviewed SHA and to lead with
   severity, file and line, concrete failure mode, and fix direction. Do not
   name an invocation mechanism or prescribe platform-specific agent tooling.
10. Wait up to 30 minutes per reviewer unless the user sets another deadline,
    polling without treating silence as failure. On a plausibly transient
    failure or timeout, retry the missing review at most once using the same
    reviewer identity and SHA. Then stop through the blocker report. Never
    silently replace a missing Claude or Codex reviewer with another reviewer
    from the available family. Treat a report for a different SHA as stale.
11. Verify every finding against the code. Record dismissed findings with a
    one-line reason. Send validated actionable findings to the implementation
    agent and have it edit the worktree. The coordinator then inspects the full
    diff, runs affected check-only verification, commits and pushes corrections,
    and obtains fresh concurrent Claude and Codex reviews of the new pushed
    HEAD. Allow at most three complete dual-review rounds, including the initial
    round. Every correction push, including one triggered by CI, consumes the
    next complete dual-review round. Never push a correction unless another
    round remains; do not create a fourth review round. Stop with a concrete
    blocker if issues remain, the same failure class repeats, or scope expands
    beyond the approved plan.
12. Monitor GitHub CI for the current pushed HEAD. Route actionable CI failures
    through the same correction, verification, push, and re-review process.
    Unless the user sets another deadline, wait at most 60 minutes and 30 status
    checks. Stop through the blocker report when required checks remain pending
    or fail without an actionable in-scope correction. Before success, run the
    complete repository-defined local gate in check-only mode on the final
    pushed HEAD and record every command and result against that SHA. Any file
    or commit change invalidates that gate. Finish only when the gate passes,
    both reviewer identities report no validated blocking findings on the same
    current pushed HEAD, and required GitHub checks for that HEAD are green.
    Then mark the draft PR ready and verify the transition. If residual findings
    need a user decision, leave it draft and report why.

Do not wait indefinitely for human or bot PR comments unless the user also
requested ongoing PR maintenance.

## Coordination Guardrails

- Keep planning, implementation, and the two reviewer roles distinct. Do not
  substitute the coordinator for a missing clean-context role.
- Allow only the implementation agent to edit feature files. The coordinator
  alone owns integration decisions and Git or GitHub mutations, but runs only
  check-only verification commands. Route changes from formatters, fixers,
  codegen, or mutating hooks through the active implementation writer, then
  reinspect the complete diff before proceeding.
- Give reviewers read-only repository access and useful read-only research
  capabilities. Do not let them edit, commit, push, mutate external state, or
  delegate the review.
- Recheck the actual diff, commands, reports, PR, HEAD, and CI state rather than
  trusting summaries.
- Do not stash, reset, clean, or otherwise disturb unrelated user changes in the
  original checkout.

## Cleanup and Reporting

After successful completion, remove the temporary worktree and temporary
artifacts. Keep the feature branch while its PR remains open; do not delete or
merge it.

On cancellation or failure, leave the worktree and branch intact unless the user
requests cleanup. Report the worktree path, branch, base and current SHAs, PR
URL if created, completed checks, the pending or failed reviewer identity or CI
checks, elapsed deadline or attempt budget, blocker, and exact command or action
that resumes from the preserved state.

On success, report the PR URL, base and branch, final pushed SHA, commits,
verification run, both reviewer outcomes, dismissed findings and reasons, any
deviations from the approved spec, CI result, ready state, and cleanup
performed.
