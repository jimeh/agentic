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
