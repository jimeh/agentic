---
name: ux-review
description: >-
  Review a user-facing change in the running app, web, desktop, or mobile,
  through a fresh reviewer who uses it as a new user would, then triage and
  re-check the fixes. Use when requested or selected by a delivery workflow;
  static UI code audits use web-design-guidelines.
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

The review is read-only for the repository. The reviewer does not edit, stage,
commit, push, or post. It may start the app, create throwaway data, and write
artifacts outside the checkout. Fixing findings needs separate authority from
the user or an owning workflow such as `ship-feature-pr`; hand that workflow the
triaged findings.

Never point the app at production or at a live account, cluster, or database.
Use the project's local or test environment only. Name in the brief the data the
reviewer may create, change, or delete, and require it to clean up.

Computer use acts on the user's real desktop. Limit it to the app under review,
never operate other apps or signed-in accounts, and leave OS permission prompts
to the user. Review mobile apps on a dedicated simulator, emulator, or test
device, never on the user's personal device.

## When to Run

Run when the user asks or an owning workflow selects this skill. A change with
nothing a user sees or touches skips it, and the report says so.

Run it after the implementer's own visual check and before `dual-review`, so the
code reviewers cover the UX corrections in the same pass. When both must run on
the same head, reconcile their findings into one correction batch and name the
UX correction commit as a risk area in the follow-up code review. Corrections
for UX findings have introduced interaction regressions that only code review
caught.

## Choose the Surface and Driver

Identify each surface the change reaches and load its reference for drivers and
hazards:

- [web](references/web.md): a browser, or the web build of a desktop app;
- [desktop](references/desktop.md): Electron, Tauri, or native desktop apps,
  including computer use; and
- [mobile](references/mobile.md): iOS and Android on simulators, emulators, or
  devices.

Prefer a scripted driver for the coverage matrix, because it repeats steps and
measures exactly. Add real-OS interaction, such as computer use or a device, for
behavior a scripted driver cannot show. Confirm before briefing that the
reviewer can reach its driver; some host tools work from the parent thread only.

## Prepare the Environment

- Pin the revision under review. Take a checkout snapshot as `t3-delegation`
  describes and confirm it is unchanged after the run.
- Find the launch recipe in a project-local verification skill, the project
  instructions, or the task runner. When none exists and the review will recur,
  suggest `create-verification-skill`.
- Give the reviewer its own app instance, data directory or profile, and driver
  session: a browser context, a desktop window, or a dedicated simulator. A
  shared instance blocks fault states and leaves its debris behind.
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
own notes. These rules decide the review's value:

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
- Include the prohibition on nested delegation.

## Run the Reviewer

Start one fresh reviewer with no parent history, explicitly using
`fork_turns="none"` where supported. It must run commands, start processes, and
drive the app, so do not use plan mode or the read-only transports of
`claude-review` and `codex-review`.

- Prefer a native subagent of the current host that can run a shell and reach
  the driver.
- Inside T3 Code, a child task through `t3-delegation` also works. Use the
  `review` role and a runtime mode that can listen on local ports and launch the
  app. A Claude child in `auto` can; a Codex child in `auto` cannot listen on a
  local port.
- When only another transport can reach the driver, such as `codex-computer-use`
  for computer use from a Claude session, use it with this skill's brief.
- Use Claude Opus 5.5 at high effort unless the user or the transport chooses
  otherwise.

When no fresh reviewer can reach the driver, do the review yourself with the
same brief, and report that it lacked a fresh reviewer.

Expect 15 to 45 minutes. Apply the reviewer lifecycle rules of the provider
skills: a quiet reviewer is normal, and only a diagnosed failure justifies a
retry. Take the report from the reviewer's final message, because a subagent's
file writes may be refused.

## Triage

Treat every finding as a candidate:

- Reproduce each blocking finding yourself before acting on it.
- Rule out the driver artifacts listed in the surface references. Re-run a
  keyboard focus finding with human-paced input. Treat a result seen only under
  emulation or on a simulator as low confidence when it depends on hardware,
  timing, or the network.
- Check each suggested fix against standing project rules. A finding can be real
  while its suggested fix is not allowed.
- Decide per finding: fix, fix differently with the reason, follow-up, or reject
  with the reason. Fix what would block, confuse, or slow a user or looks
  unfinished in the changed surface. Record taste, problems that predate the
  change, and work that needs a new capability as follow-ups.
- Treat a missing capability the reviewer raises as a product question for the
  user, not a defect.
- Record the decisions where the change is tracked, such as the plan or the pull
  request description.

## Correct and Re-Check

With fix authority, hand corrections over as settled behavior: exact copy, the
reviewer's evidence, a test for each behavior that can be tested, and a check by
the implementer in the running app at the sizes and themes that matter.

Then re-check in the running app. Send the reviewer a follow-up scoped to the
corrected findings and what those corrections could disturb nearby. Inside T3
Code, that is a new child task carrying the original brief, the findings, and
the decisions. It is not another open-ended review. The implementer's or your
own check is the minimum for polish and does not replace this re-check for a
blocking, confusing, or slowing finding. Then run `dual-review` on the corrected
head. Apply the Check Convergence section of `babysit-pr` when corrections keep
producing findings.

## Report

Lead with the verdict: ready, ready after named fixes, or not ready. Then give:

- the revision, environment, surfaces, drivers, platforms or devices, sizes, and
  themes covered;
- findings by severity, each with its decision and reason;
- how discovery went before the reviewer knew where the feature was;
- states, platforms, and inputs not covered, and why;
- the re-check result; and
- confirmation that cleanup ran and the checkout snapshot is unchanged.

Never describe a review whose fault states were skipped, whose fixes were not
re-checked, or that lacked a fresh reviewer as complete coverage.

Record new launch recipes, fault-state recipes, and driver hazards in the
project's verification skill or agent instructions so that a coordinator on
another engine finds them, not only in one engine's session memory.
