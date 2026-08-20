---
name: create-verification-skill
description: >-
  Create or materially refresh a project-local skill for proving behavior
  through a real UI, CLI, API, service, or desktop surface. Use for an explicit
  verification-workflow request, not an ordinary product test or a general
  harness audit.
---

# Create a Verification Skill

Build a project-local workflow that a future agent can load cold and use to
exercise the real product surface. This is repository harness work: use
`harness-engineering` for evidence and priorities, this skill for the concrete
verification package, and the environment's skill-authoring workflow for
packaging and metadata.

An explicit creation or refresh request authorizes edits inside the verification
skill, its owned helpers, and approved task-runner entry points needed to invoke
those helpers. It does not authorize product fixes, production or live-system
access, unrelated harness rewrites, commits, pushes, or external posts. If the
base application cannot run, report the blocker instead of silently fixing
product code.

## Discover the Real Contract

Inspect the repository before asking questions:

- **Surface**: what the user touches and which surface this skill owns
- **Launch**: canonical dependency, build, seed, start, readiness, and teardown
  commands
- **Drive**: existing browser, PTY, CLI, HTTP, desktop, or integration harnesses
- **Observe**: visible state, exit status, responses, logs, filesystem effects,
  and other user-relevant evidence
- **Isolate**: ports, profiles, data directories, credentials, external effects,
  and whether concurrent instances are safe
- **Failures**: recurring manual commands, brittle setup, and proof gaps already
  visible in history, CI, or review feedback

Prefer repository-owned commands and current configuration over copied setup
instructions. Ask only for a material choice or fact that inspection cannot
establish. Never drive a shared user session or external account merely because
it is reachable.

## Author the Project-local Skill

Use the environment's skill-authoring workflow to choose the project-local
package location, discovery metadata, and cross-agent linking. Do not replace a
conflicting directory or unmanaged link without the user's direction.

The generated `SKILL.md` must contain concrete, repository-specific sections:

1. **Launch**: exact command, isolation inputs, readiness signal, ownership of
   the process, and teardown.
2. **Doctor**: a cheap read-only check for identity, version, readiness, auth,
   and whether this is the instance the workflow started.
3. **Drive**: stable selectors, prompt strings, routes, commands, or protocol
   calls from the real application. Prefer accessible or semantic handles over
   coordinates and timing guesses.
4. **Evidence**: what proves the action and resulting state, including relevant
   side effects. Name the artifact location and keep evidence through cleanup.
5. **Cleanup**: stop only owned processes and remove only owned scratch state.
   Never kill by broad process name.
6. **Safety**: local versus live boundaries, secret redaction, shared-session
   hazards, external side effects, and dry-run limitations.

Ship deterministic helpers only when prose and existing commands are
insufficient. Keep them inside the skill's `scripts/` directory or expose them
through the repository's established task runner. Document every invocation;
make executable helpers executable. Do not duplicate a canonical project task.

For a substantial surface, read
[references/feature-map.md](references/feature-map.md) and seed a small
user-facing feature map. Skip it for a narrow library or single-command tool
when one verification recipe is genuinely complete.

## Prove the Skill

Run the generated workflow once from a clean agent perspective:

1. launch an isolated instance or invocation
2. run doctor and verify it identifies the owned target
3. drive one representative user path through the real surface
4. capture the action, result, and material side effect
5. clean up, then prove the evidence remains and no owned process or scratch
   state was stranded

Use mocks only at an existing production boundary. Check what a dry-run or test
mode actually avoids; do not trust its name. If a safe live pass is impossible,
leave the package explicitly draft and name the missing prerequisite and risk.

## Refresh an Existing Skill

When refreshing, edit only the verification package and its owned task entry
points. Compare its launch, doctor, drive, evidence, cleanup, and feature map
against current source and one live local pass. Fix documentation or harness
drift; report product regressions instead of changing product code to make the
skill pass. End with one of: **clean**, **changed**, or **blocked**, plus exact
coverage and evidence.

## Source

Adapted from Cursor's pinned `pstack`
[`create-verification-skill`](https://github.com/cursor/plugins/blob/60c641e4fad674784b30abcf9f8915dea39df38d/pstack/skills/create-verification-skill/SKILL.md)
and
[`maintain-verification-skill`](https://github.com/cursor/plugins/blob/60c641e4fad674784b30abcf9f8915dea39df38d/pstack/skills/maintain-verification-skill/SKILL.md).
