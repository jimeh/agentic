# Desktop Surface

Drivers and hazards for reviewing a desktop app: Electron, Tauri, or native.
Check the project's notes for newer hazards; tool behavior changes between
versions.

## Drivers

Use a scripted driver for the coverage matrix, because it repeats steps and
measures exactly. Use computer use for what only the real OS shows: native
menus, system dialogs, drag between windows or to other apps, window management,
and OS shortcuts.

- **Electron through Playwright.** Launch the app with `_electron.launch` from
  the project's installed Playwright, or use the agent-browser `electron` skill.
  The renderer is then a page, and the web hazards apply to it.
- **Computer use.** Claude's computer use where the host offers it, the
  `codex-computer-use` skill from a Claude session, or Codex's own computer use
  in a Codex session. It drives the real pointer and keyboard from screenshots.
- **Platform UI automation** when the project already uses it, such as UI tests,
  macOS System Events through `osascript`, or Windows UI Automation. It moves
  the real desktop too, so it needs the same confirmation as computer use. A
  native app without such tests has no scripted driver; plan its real-OS checks
  as confirmed computer use or as uncovered.

## Hazards

- **Computer use acts on the user's real desktop.** Start it only after the user
  confirms, as `SKILL.md` requires. Limit it to the app under review and the
  minimum OS surfaces a named check needs, such as a Finder window on a scratch
  folder. Never operate signed-in accounts or the user's own files. Run the app
  with a scratch profile or data directory. OS permission prompts for
  accessibility or screen recording are the user's to grant; stop and report
  them.
- **The desktop is shared.** Notifications, other windows, and the user's own
  input can steal focus or cover the app. Confirm the app is frontmost and the
  expected window is showing before each check.
- **Screenshots are scaled.** Coordinates may be in scaled or logical points,
  not screenshot pixels. Confirm a click landed by its effect, not by its
  coordinates.
- **The test launch is not the shipped app.** A development or test launch can
  differ from the packaged build in menus, window chrome, file associations,
  auto-update, and permissions. Name which one was reviewed.
- **An inherited `ELECTRON_RUN_AS_NODE=1` makes Electron run as Node.** Some
  hosts set it, T3 Code among them; unset it before launching.
- **OS conventions only show on that OS.** Menu placement, `Cmd` versus `Ctrl`,
  window controls, and file dialogs need the real platform. List the platforms
  not reviewed.
- **Window size comes from the OS.** Check the minimum window size the app
  allows, a maximized window, and a second display at a different scale when
  available.
