# UX Review Brief Template

Fill each section from the project and the change. Drop a section only when it
cannot apply, and say why in the report. Quoted lines are wording that worked in
earlier reviews; adapt them rather than paraphrasing them away.

## 1. Role and boundaries

> Review the usability and visual quality of one feature of a running
> application. This is an experience review of the running app, not a code
> review. You have no history of this work, on purpose.

- Perform this task directly. Do not invoke delegation skills or launch model
  workers through native tools or CLIs unless the parent explicitly authorizes
  that structure.
- Do not edit, create, or delete files in the repository, and do not commit,
  stage, stash, reset, switch branches, push, or post anything. Name any ignored
  scratch paths the project's recipes write to, such as a data directory, as the
  only exception.
- Save screenshots and scripts under an absolute scratch path outside the
  checkout.
- When the user did not consent to computer use and OS automation for this run:

> Do not use computer use, OS automation, or any tool that asks for desktop or
> OS permission. If a tool asks for an approval, stop using it and list the
> check it served as not checked.

- Name the environment the reviewer may touch, the data it may create, change,
  or delete, and what it must never touch.

## 2. The product and the feature

- One paragraph on the product, with pointers to its vocabulary and design
  principles, such as a glossary or the design section of the agent
  instructions.
- The feature as capabilities in user terms, with no control locations:

> I am deliberately not telling you where these are in the UI or how they work.
> Part of the review is whether a new user finds and understands them. Note how
> long it took you and what you tried first.

- When discovery is out of scope, say so and give the locations instead.

## 3. Environment

- Exact start and stop commands for the reviewer's own instance, and how to
  reach it: a URL, a desktop launch command with a scratch profile, or a
  simulator or device with the app installed.
- Sample data available and what it exercises.
- Recipes for each prepared fault state: limited permissions, backend stopped,
  connection dropped versus clean shutdown, restart, offline, version mismatch,
  scale.
- How to switch theme and text size: the app's own control, its stored setting,
  or the OS or simulator setting.
- The driver to use, with the fallbacks and hazards from the surface reference
  and the project's notes.
- Known driver artifacts not to report as app problems.
- A first step that proves the driver works, without locating the feature when
  discovery is in scope:

> Before anything else, launch the app, view a screenshot of its window, and
> make one harmless interaction with it. If the driver fails at any of these
> after one reconnect, stop and report the review as blocked, with the exact
> error and the step that failed.

Blocked covers driver and environment failures only. Failing to find the feature
is a discovery finding, never a blocked review.

## 4. Tasks as user goals

Three to five goals phrased as a user would state them:

> I am looking at the `web` Deployment and want to see whether its Pods are
> healthy and open one.

## 5. State matrix

A numbered list of states to reach, with how to reach each: first use, empty,
loading, error, not permitted, connection lost and restored, the item deleted
while open, large data, and live changes. Add the states the surface has:

- web: reload, back and forward, and a second tab or window;
- desktop: a second window, minimize and restore, quit and relaunch, and a
  system dialog such as file open; and
- mobile: an OS permission prompt granted and denied, backgrounding, the app
  killed and relaunched, rotation, the software keyboard covering input, and an
  interruption such as a notification.

Mark any state the orchestrator covers itself so the reviewer does not report it
as missed.

## 6. Coverage matrix

- Sizes the app really renders at: container or pane widths as well as window
  widths on the web and desktop, including the minimum window; a small phone, a
  large phone with a cutout, both orientations, and a tablet on mobile when
  supported.
- Both themes, the largest text size or zoom the platform offers, reduced
  motion, and a second locale.
- The surface's platform checks from its reference.
- Every supported input: keyboard-only, pointer, touch and gestures, and a
  screen reader for the main path when accessibility is in scope.
- A second engine or platform for the main path when the app supports more than
  one, such as WebKit, another OS, or the other mobile platform.

## 7. What to judge

1. Can a user find and understand the feature without instructions?
2. Does each control sit where users of the named comparable tools expect it,
   and behave the way the platform's conventions say, such as Apple's Human
   Interface Guidelines, Material Design, or the Windows guidelines?
3. Is it consistent with the rest of the app in placement, wording, spacing, and
   vocabulary?
4. Are hover, focus, pressed, disabled, empty, loading, and error states present
   and clear? Does a disabled control say why?
5. Does it look finished in both themes: alignment, truncation, contrast, and no
   layout jumps? On touch surfaces, are targets large enough and clear of safe
   areas and the keyboard?
6. Can a user ever lose work, or change something they cannot see, without a
   clear warning? Is it always clear what an action will act on?

Add feature-specific questions, such as:

> Could a dead session ever be mistaken for a live one, including from the tab
> strip alone?

When a project rule prefers established packages over hand-rolled interaction
code, also ask whether the feature hand-rolled something a package does better.
Name the one source directory the reviewer may read for that question, after the
rest of the review.

## 8. Out of scope

> Known and out of scope, so do not report them: ...

List known issues, owner decisions, and standing rules that bound fixes, such as
a restriction on new key bindings.

## 9. Plan comparison

> Only after you have formed your own impressions, read the plan's UI and UX
> section and say where the running app differs from it.

Omit this section when a stricter cold review matters more than the comparison.

## 10. Output

Put the whole report in the final message, not in a file.

- Findings ordered by harm, each with what was seen, the screenshot you viewed,
  the repro script and step that reach it, the driver, platform or device,
  theme, and size, what a user expects instead with the comparable pattern, a
  suggested fix, and a severity:
  - **blocks**: a user cannot complete a task, loses work, or is misled about
    what happened;
  - **confuses**: a user is likely to misread state or take the wrong action;
  - **slows**: a user gets there, but with extra effort or a dead end;
  - **looks unfinished**: visual defects such as clipping, misalignment, weak
    contrast, or layout jumps;
  - **taste**: a matter of preference, reported separately.
- Flags where they apply: predates this change, low confidence (seen once, or
  only under emulation or on a simulator), and suspected cause (labelled as
  inference).
- Measurements where they apply: contrast ratio, focused element, target size,
  timings with machine load noted.
- Every state check asserts a positive signal that the app is live and on the
  expected screen, so a blank, crashed, or backgrounded app cannot pass.
- What works well, stated plainly.
- How discovery went.
- Not checked, with reasons. Do not claim a check you did not make.
- Verdict: ready, ready after named fixes, not ready, or blocked when the driver
  or environment prevented the review. Blocked says nothing about the product.
- Screenshots you viewed, one line each. Judge how the app looks only from
  screenshots you viewed; a saved file you did not open is not evidence.
- Repro scripts: keep the driver scripts you ran, each runnable from a fresh
  start of the app with one command, and list those commands. A re-check replays
  them.
- Cleanup confirmation.

## Follow-up round

Carry the path to the saved brief, or the brief itself when the reviewer cannot
read it, with the findings, the triage decisions, the repro scripts, and the
corrected revision. Ask the reviewer to replay each corrected finding's script
first, then confirm the finding in the running app by eye, check what the
corrections could disturb nearby, and report new problems as located in the
correction. A script that no longer reaches its state is a result to report.
When a later correction changed an interaction without a UX finding behind it,
such as a moved control, scope the round to that interaction, including whether
a user still finds it without being told. Do not ask for a new open-ended
review.
