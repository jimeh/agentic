---
name: ux-review
description: >-
  Have a fresh reviewer try a user-facing change in the running app, web,
  desktop, or mobile, then triage findings and re-check fixes; also audits UI
  code against interface guidelines. Use only when explicitly requested or
  required by a user-selected ship-feature-pr workflow.
---

# UX Review

Judge whether a change that a user sees or touches is easy to find, behaves the
way users of comparable tools and the platform expect, holds up in every state,
and looks finished. A fresh reviewer uses the running app, in a browser, on the
desktop, or on a simulator or device, instead of reading the code. This
complements `dual-review`: code reviewers judge the diff, this review judges the
experience, and each has caught defects the other missed.

The orchestrator owns the environment, the brief, triage, and the report. The
reviewer owns observation and findings.

## Authority

The review is read-only for the repository: the reviewer and the orchestrator do
not edit, stage, commit, push, or post while it runs, including documentation.
The reviewer may start the app, create throwaway data, and write artifacts
outside the checkout or in ignored scratch paths that the project's recipes use.
Fixing findings needs separate authority from the user or an owning workflow
such as `ship-feature-pr`, and committing the fixes needs commit authority.
Without fix authority, report the triaged findings.

Never point the app at production or at a live account, cluster, or database.
Use the project's local or test environment only. Name in the brief the data the
reviewer may create, change, or delete, and require it to clean up.

Computer use and OS-level automation drive the user's real desktop. Before
starting either, get the user's confirmation for this run, even inside a
workflow that authorized everything else; an owning workflow may ask during its
preflight. Without it, use scripted drivers only and report the real-OS checks
as uncovered. Once confirmed, limit it to the app under review and the minimum
OS surfaces a named check needs, such as a Finder window on a scratch folder.
Never operate signed-in accounts or the user's own files, and leave OS
permission prompts to the user. Review mobile apps on a dedicated simulator,
emulator, or test device, never on the user's personal device.

## When to Run

Run only when the user explicitly asks for a UX review or a guideline audit, or
when a workflow the user selected, such as `ship-feature-pr`, requires it.
Finishing a UI change is not a request: the implementer's own running-app check
covers it. A change with nothing a user sees or touches skips it, and the report
says so.

When an implementer built the change, run it after the implementer has checked
the change in the running app. When a code review follows, whether in an owning
workflow or at the user's request, name the commits that corrected UX findings
as a risk area in its brief. UX corrections have introduced interaction
regressions that only code review caught. This skill never starts a code review
itself.

## Static Audit

When the user asks to audit UI code against interface guidelines without a
running app, such as a component library or named files, run a static audit
instead of the workflow below. It needs no reviewer, environment, or verdict,
and it stays read-only.

1. Fetch the current guidelines named in the surface reference, or use its
   built-in list without the network and say so.
2. Read the named files, or ask which files to audit when none are named.
3. Check every rule, observable and source-only alike, against the source.
4. Report findings grouped by file, one terse line each in `file:line` form,
   with a pass mark for each clean file. Explain a finding only when its fix is
   not obvious.

House conventions apply only when the project adopts them, as in the review.

## Choose the Surface and Driver

Identify each surface the change reaches and load its reference for drivers,
platform checks, and hazards:

- [web](references/web.md): a browser, or the web build of a desktop app;
- [desktop](references/desktop.md): Electron, Tauri, or native desktop apps,
  including computer use; and
- [mobile](references/mobile.md): iOS and Android on simulators, emulators, or
  devices.

Prefer a scripted driver for the coverage matrix, because it repeats steps and
measures exactly. Add real-OS interaction, such as computer use or a device, for
behavior a scripted driver cannot show. Confirm before briefing that the
reviewer can reach its driver, because host tools differ in what they allow a
subagent or child task to call.

## Prepare the Environment

- Pin the revision under review. Take a checkout snapshot as `t3-delegation`
  describes and confirm it is unchanged after the run.
- Find the launch recipe in a project-local verification skill, the project
  instructions, or the task runner. When none exists and the review will recur,
  suggest `create-verification-skill` in the report.
- Give the reviewer its own app instance, data directory or profile, and driver
  session: a browser context, a desktop window, or a dedicated simulator. Start
  each round with a fresh data directory or profile. A shared or reused instance
  blocks fault states and leaves its debris behind.
- Prepare the states the reviewer cannot easily produce itself, such as limited
  permissions, a backend it may stop or kill, offline or flaky network, a
  version mismatch, large data, a second window, or an app killed in the
  background. Hand over the recipes. Any state that neither you nor the reviewer
  will cover goes in the report as uncovered; never drop it from the brief
  silently.
- Check machine load and stray processes from earlier work. Timing and rendering
  observations taken under heavy load are not evidence.
- Do your own hand check first. It finds different problems. Keep its
  conclusions out of the brief.

## Brief the Reviewer

Build the brief from [the brief template](references/brief-template.md), which
holds the section order, the severity scale, the output contract, and wording
that worked. Include the hazards from the surface references and the project's
own notes. Save the brief to a file in the scratch directory, so later rounds
can point to it. These rules decide the review's value:

- Describe the feature as capabilities in user terms, not where its controls
  are. Finding the feature is part of the review unless the brief says discovery
  is out of scope.
- The reviewer uses the app before reading any plan, and reads no source except
  to answer a question the brief names. Comparing the result with the plan is a
  later step.
- Give tasks as user goals, a numbered state matrix, and a coverage matrix: the
  sizes the app really renders at, both themes, larger text sizes where the
  platform offers them, and every supported input.
- Name comparable tools and the platform conventions the feature should follow.
- List known issues, owner decisions, and standing project rules, such as a
  restriction on new key bindings, so the reviewer neither reports them nor
  proposes fixes that break them.
- Include the prohibition on nested delegation, and state whether the user
  consented to computer use and OS automation for this run.

## Run the Reviewer

Start one fresh reviewer with no parent history, explicitly using
`fork_turns="none"` where supported. It must run commands, start processes, and
drive the app, so do not use plan mode or the read-only transports of
`claude-review` and `codex-review`.

The reviewer runs on your own harness and model at your effort, unless the user,
a session routing preference that covers UX review, or an owning workflow names
another; start a named engine as `implement-feature` describes for delegated
workers. Where the host does not inherit your model and effort, set them
explicitly, using high effort when yours is unknown, because an omitted model
can fall back to a weaker default.

- Prefer a native subagent of the current host that can run a shell and reach
  the driver.
- Inside T3 Code, a child task through `t3-delegation` also works, on this
  thread's provider instance and model with its inherited options. Use the
  `review` role and a runtime mode that lets it start the app and its driver. A
  Codex child in `auto` cannot launch Chromium, connect to a local port, or
  write under the home directory, so a Codex reviewer of a local app needs
  `full-access`; say in the report that its sandbox was off.
- When only another transport can reach the driver, such as `codex-computer-use`
  for computer use from a Claude session, use it. This skill's brief replaces
  that transport's prompting guidance; the transport skill still owns
  invocation, artifacts, and failure handling.

When no fresh reviewer can reach the driver, do the review yourself with the
same brief, and report that it lacked a fresh reviewer.

Expect 15 to 45 minutes. Apply the reviewer lifecycle rules of the provider
skills: a quiet reviewer is normal, and only a diagnosed failure justifies a
retry. A reviewer stopped on an approval prompt, such as a computer-use or OS
permission request, has gone beyond its brief or its mode. Never answer the
prompt for the user. Cancel the reviewer, then rerun it with a brief or mode
that avoids the prompt, or report the check as uncovered. Require the whole
report in the reviewer's final message.

## Triage

Treat every finding as a candidate:

- Reproduce each blocking finding yourself before acting on it.
- Check the changed source against the source-only rules in the surface
  reference and in any guidelines it had you fetch for the brief, and add hits
  as findings with file and line.
- Rule out the driver artifacts listed in the surface references. Re-run a
  keyboard focus finding with human-paced input. Treat a result seen only under
  emulation or on a simulator as low confidence when it depends on hardware,
  timing, or the network.
- Check each suggested fix against standing project rules. A finding can be real
  while its suggested fix is not allowed.
- Decide per finding: fix, fix differently with the reason, follow-up, or reject
  with the reason. Fix what would block, confuse, or slow a user or looks
  unfinished in the changed surface. Record taste and problems that predate the
  change as follow-ups. For a review of a whole surface rather than a change,
  the reviewed surface is the scope, so its problems are findings, not
  follow-ups.
- A capability that the agreed contract, or the user's request when there is no
  contract, requires and the change lacks is a defect. Record a missing
  capability outside it as a follow-up and raise it as a product question in the
  report, without blocking on the answer.

## Correct and Re-Check

With fix authority, make or hand over corrections as settled behavior: exact
copy, the reviewer's evidence, a regression test for each material behavioral
correction, and a check in the running app at the sizes and themes that matter.
Presentation-only corrections need running-app evidence rather than tests.

Then re-check in the running app, pinned to the corrected revision or, for
uncommitted corrections, a fresh checkout snapshot. Size the re-check to the
findings:

- For polish, a looks-unfinished or taste finding, replay its repro script
  yourself and view the screenshot it saves.
- For a blocking, confusing, or slowing finding, send a fresh reviewer a
  follow-up scoped to the corrected findings and what those corrections could
  disturb nearby. It replays the repro scripts first, then judges the corrected
  states by eye. Inside T3 Code, that is a new child task. It carries the path
  to the saved brief, or the brief itself when the reviewer cannot read the
  file, the findings, the decisions, and the scripts. It is not another
  open-ended review.

Apply the Check Convergence section of `babysit-pr` when corrections keep
producing findings. Then hand the corrected revision and the UX correction
commits back to the user or the owning workflow.

## Report

Lead with the verdict: ready, ready after named fixes, or not ready. Then give:

- the revision, environment, surfaces, drivers, platforms or devices, sizes, and
  themes covered;
- findings by severity, each with its decision and reason;
- how discovery went before the reviewer knew where the feature was;
- states, platforms, and inputs not covered, and why;
- the re-check result and the UX correction commits;
- the brief, findings, decisions, and repro scripts, kept for a later re-check;
- proposed documentation changes: new launch recipes, fault-state recipes, and
  driver hazards for the project's verification skill or agent instructions, so
  a coordinator on another engine finds them; and
- confirmation that cleanup ran and the checkout snapshot is unchanged.

Never describe a review whose fault states were skipped, whose fixes were not
re-checked, or that lacked a fresh reviewer as complete coverage.
