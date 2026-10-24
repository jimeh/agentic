# Web Surface

Drivers and hazards for reviewing an app in a browser, including a web build of
an app that also ships on desktop. Check the project's notes for newer hazards;
tool behavior changes between versions.

## Drivers

1. **The project's installed Playwright.** Run scripts from a scratch directory
   outside the checkout and resolve Playwright from the project, for example
   with `createRequire` against the package that depends on it. Keep one
   long-lived browser and send it small step scripts, or a REPL, so each step
   runs against the live page. Use real `page.mouse` moves with several steps
   for drags, and `page.keyboard` for keys. Repeat the main path in a second
   engine, such as WebKit, when the app supports more than one.
2. **agent-browser** in a fresh named session for each run, with absolute
   screenshot paths and a bounded timeout around `screenshot`.
3. **Host preview tools**, such as T3 Code's `preview_*` tools. Always open a
   new tab with `reuseExistingTab: false` and pass its `tabId` on every call; an
   omitted `tabId` can fall back to the user's visible tab. Pass a scratch
   `profileId` from `preview_status`. When none exists, ask the user or switch
   drivers; never use the default profile, which carries the user's logins.
   Close the tab during cleanup. Older T3 Code builds refused these tools to
   native subagents, so confirm the reviewer can call them before briefing.

## Platform checks

Put these in the brief's state and coverage matrices. The reviewer checks them
in the running app: the screen, the live DOM, the accessibility tree (for
example Playwright's `ariaSnapshot()`), the console, and the network panel. That
is observation, not reading source. They restate the rules of Vercel's
[Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)
as of their last refresh; the fetch below keeps the review current.

While preparing the brief, the orchestrator fetches the current rules with the
host's web tool from both
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
and
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/AGENTS.md`;
`AGENTS.md` is the build-time version, and each carries rules the other lacks.
It adds any observable rule this list lacks to the brief and keeps any
source-only rule for its own check. Without the network, use this list and
report that the rules were not refreshed. A static audit fetches the same files.

- **Accessibility:** every control has an accessible name, even where the visual
  design omits a label, including icon-only buttons, form fields, and images,
  while decorative icons, images, and media are hidden from assistive
  technology. Roles come from native elements (`button`, `a`, `label`, `table`)
  where HTML has one; a composite widget that native HTML cannot express follows
  the matching WAI-ARIA Authoring Practices pattern. Status is never conveyed by
  color alone. Charts use color-blind-friendly palettes, and text meets contrast
  (APCA preferred). Actions are buttons and navigation is links, so
  Cmd/Ctrl-click and middle-click open a new tab. Headings are hierarchical, a
  skip link reaches the main content, and async updates such as toasts and
  validation are announced through a live region. Media has captions or
  transcripts and keyboard-operable controls, and motion has a still
  alternative.
- **Keyboard and focus:** every flow works by keyboard, following the WAI-ARIA
  Authoring Practices patterns, and focus is trapped, moved, and returned as
  those patterns describe. Every interactive element shows a visible focus
  indicator under the keyboard but not on click. Compound controls show focus on
  the group. Sticky headers, footers, and overlays never cover the focused
  element.
- **Targets:** hit targets are at least 24 px, and 44 px on mobile, with the hit
  area extended when the visual is smaller. Anything that looks clickable is
  clickable, with no dead zones. The first tooltip in a group is delayed and its
  neighbors appear at once.
- **Forms:** clicking a label focuses its control, and a checkbox or radio
  shares one hit target with its label. Fields carry a fitting `type`,
  `inputmode`, `autocomplete`, and `name`, and spellcheck is off for emails,
  codes, and usernames. Fields other than sign-in fields carry
  `autocomplete="off"` or a specific token, so password managers offer to fill
  only sign-in fields. Placeholders show an example of the expected value.
  Autofocus lands only on a single primary field, and not on touch devices.
  Inputs on mobile use at least a 16 px font, so iOS does not zoom. Paste works,
  including one-time codes, and values are trimmed of trailing spaces from text
  expansion. Typing is never blocked; validation runs afterwards, and incomplete
  forms can be submitted to show it. Enter submits a focused input, and
  Cmd/Ctrl+Enter submits a textarea. Inputs keep focus and value through
  hydration. Submit stays enabled until the request starts, then shows a spinner
  while keeping its label. Errors appear inline beside their fields, with a next
  step, and focus moves to the first one. Leaving with unsaved changes warns.
- **Motion:** with reduced motion emulated, animations, including decorative
  loops, are reduced or stopped. Animations pivot from the right origin and
  respond to input mid-way, and autoplaying motion longer than five seconds can
  be paused.
- **Content:** very short, typical, very long, and empty values truncate or wrap
  without breaking layout; empty, sparse, dense, and error states are designed,
  and every screen offers a next step or recovery; skeletons match the final
  layout; the page `<title>` matches the current context; number columns align
  with tabular figures; values with units, key shortcuts, and brand names, such
  as `10 MB` or `⌘ K`, never wrap apart; and headings avoid a one-word last
  line.
- **Layout and performance:** nothing shifts while images and fonts load on a
  throttled network; critical images above the fold load first and the rest
  lazily; motion uses compressed video rather than animated GIFs; no width shows
  an unwanted scrollbar or horizontal overflow; with large data, long lists keep
  only nearby rows in the DOM or scroll smoothly under CPU throttling; typing
  stays responsive; mutations (`POST`, `PATCH`, `DELETE`) complete within about
  500 ms; elements align deliberately, including at ultra-wide sizes (simulate
  at 50% zoom); and the console shows no hydration or runtime errors.
- **Navigation and state:** the URL reflects filters, tabs, pagination, and open
  panels, and reload, back, and a pasted deep link restore them. Back and
  Forward restore the scroll position. In-page anchors land with their heading
  clear of sticky headers. Destructive actions confirm or offer undo.
- **Touch:** under touch emulation or on a device, there is no double-tap zoom
  delay, pinch zoom is not disabled, the tap highlight looks intended, modals
  and sheets contain their scroll, dragging does not select text and makes the
  dragged element inert, gestures have tap and keyboard alternatives, and no
  autofocus opens the keyboard on load. With a fine pointer the page does not
  rubber-band, while touch keeps pull-to-refresh.
- **Theme and states:** in the dark theme, native scrollbars, inputs, and select
  menus are dark too, and the browser theme color matches the page. Hover,
  active, and focus states are more prominent than rest.
- **Locale:** dates, times, numbers, and currency follow the browser locale;
  check with a second locale. The language follows the browser's language
  settings, not the user's location. Brand names, code tokens, and identifiers
  carry `translate="no"` in the live DOM.
- **Copy:** labels name their action, errors say how to fix them, copy speaks to
  the user in the active voice, and wording matches the rest of the app. Apply
  house conventions such as title case, curly quotes, the ellipsis character in
  loading text and placeholders, numerals for counts, or `&` for "and" in tight
  spaces only when the project adopts them.

Some rules show only in source, or only on a platform the review lacks:
`transition: all`, animating properties other than `transform` and `opacity`,
layout reads during render and interleaved DOM reads and writes, expensive or
handler-less controlled inputs, list rendering of large arrays without
virtualization, missing preconnect or font preload, fonts without
`font-display: swap`, hydration-unsafe rendering and `suppressHydrationWarning`
beyond a known mismatch, JavaScript measurement where CSS layout would do,
full-bleed layouts without `env(safe-area-inset-*)`, and native `<select>`
elements without explicit background and text colors. The cold reviewer does not
read source, so after its report the orchestrator checks the changed UI source
against these rules and the source-only rules it fetched, and reports hits with
file and line.

## Hazards

- **A blank tab passes negative checks.** agent-browser `press Enter` with focus
  on the body has replaced the page with `about:blank`. Click buttons by role,
  and include the URL in every state check's positive signal.
- **Screenshots hang.** agent-browser `screenshot` has hung in fresh sessions
  while `snapshot` still worked. Switch drivers rather than retrying.
- **Relative paths write into the repository.** agent-browser resolves relative
  screenshot paths against the working directory.
- **A click scrolls wide elements.** Playwright's `locator.click()` scrolls the
  element's centre into view. On a very wide element, such as an editor line,
  that shifts the scrolled content sideways. Click near the start with
  `position`.
- **Hover or click waits forever on `aria-disabled`.** Move the mouse to the
  element's bounding box instead.
- **An emulated color scheme may not switch the app's theme.** Use the app's own
  theme control or its stored setting.
- **Emulation approximates.** Device pixel ratio, CPU throttling, and offline
  emulation are not the real conditions.
- **A spoofed user agent does not change the OS.** Platform key rules and
  clipboard events still follow the host OS; list them as not checked.
- **Headless rendering omits native chrome.** Scrollbars and cursors may not
  render; say so rather than judging them.
