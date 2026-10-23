# Provenance

First-party skill. It generalizes the "experience review" step run on the hukube
feature stack in October 2026: nine reviews across PRs #8 to #15 and a follow-up
on #14, each by a fresh Claude Opus 5.5 reviewer, plus a later Codex-coordinated
PR (#22) that ran no independent review because the step lived only in the
coordinator's briefs and Claude-only memory.

Evidence that shaped the rules:

- Each review found user-facing defects that tests, the implementer's check, and
  the dual code review had missed. The worst: a discarded edit applied on
  reconnect, a live session's tab vanishing on reload, and a failing command
  remembered as the default.
- Cold discovery, tasks as user goals, prepared fault states, and real container
  widths produced the strongest findings. A brief that dropped fault states, or
  shared an app instance, lost coverage.
- No run re-checked its fixes in the running app with a fresh reviewer. In three
  layers the UX corrections introduced regressions that only code review caught.
- Driver artifacts cost time and nearly became findings; the web ones are
  collected in `web.md`.
- Severity labels drifted across briefs that were rewritten from scratch each
  time; the template fixes one scale.

The hukube reviews covered the web surface only. The desktop and mobile
references generalize the same workflow from platform tooling and conventions;
revise them when real reviews on those surfaces show what holds.
