---
name: airplan
description: >-
  Upload agent-produced documents or file collections with airplan and return
  shareable links. Use when the user explicitly asks for a link to a document,
  screenshot, recording, or other produced file, or when authorized pull
  request or issue work explicitly calls for linkable visual evidence. Do not
  upload merely because an artifact exists or might be convenient.
---

# airplan

Use `airplan` only for an explicit sharing request or when an authorized pull
request or issue workflow explicitly calls for visual or downloadable evidence
produced during that work. Do not upload finished artifacts opportunistically.

Airplan publishes capability URLs that anyone with the link can open. Uploads
persist until deleted. Filenames are visible in direct URLs and collection
pages.

The CLI transparently uses whichever `s3` or `airplan` backend the user has
configured. Run the same commands in either case. Never inspect, print, copy,
or configure S3 credentials, Airplan API tokens, server settings, or manifest
paths. If the harness already provides Airplan MCP tools, use their equivalent
upload operation and return its URL; do not start another MCP or HTTP server.

## Documents

For one requested plan, specification, report, or other document:

1. Identify the exact intended file.
2. Run `airplan --json <file>` from the relevant project.
3. Read `.url` from stdout and return it as a clickable link.

```sh
airplan --json plan.md
# {"url":"https://plans.example.com/.../plan.html", ...}
```

### Markdown rendering

Airplan turns Markdown into a polished, responsive page. Write for the content
first; use these features when they materially improve clarity:

- GFM tables, task lists, strikethrough, and autolinks, plus definition lists
  and footnotes.
- Syntax-highlighted fenced code and exact lowercase `mermaid` fences for
  diagrams.
- GitHub-style alerts: `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, and
  `[!CAUTION]`.
- YAML/TOML frontmatter and Pandoc-style `{.columns}` / `{.column}` fenced divs
  for responsive columns.

Airplan adds light/dark themes, heading navigation, rendered/source views, and
copy controls automatically.

Markdown preserves authored raw HTML and link destinations, while HTML is
uploaded as authored. Both may execute active content when opened, so upload
only trusted documents. Repository discovery is local and uses the input
file's Git repository first; keep the command rooted in the relevant project
when uploading a temporary file.

## Screenshots, recordings, and other files

Upload related evidence in one invocation so it becomes one collection and one
cleanup unit:

1. Identify the exact intended files.
2. Review every screenshot for tokens, usernames, private messages, browser
   chrome, unrelated windows, and other sensitive content. Review recordings
   too when feasible.
3. Run one `airplan --json <file>...` invocation from the relevant project.
4. Use `.files[].url` for ordered direct resource links and `.url` for the
   collection overview.
5. Embed a direct image URL in Markdown when useful. Link recordings and
   generic files directly, and include the overview when the complete evidence
   set is useful.

```sh
airplan --json screenshot.png demo.webm
# .files[0].url → screenshot direct URL
# .files[1].url → recording direct URL
# .url          → collection overview URL
```

Multiple named files automatically form a collection. A single recognized
media or binary file does too. Use `--files` to upload one text-like file
unchanged instead of rendering it as a document.

For a substantial recording, supply a longer explicit timeout such as
`--timeout 2m`; do not inspect configuration or credentials to discover the
current value.

Collection members are uploaded unchanged. HTML and SVG files may execute
active content when opened. Upload only intended, trusted artifacts.

## Failure handling

- Treat stdout as valid only after the command exits successfully. Never
  fabricate, reuse, or partially report URLs from a failed collection.
- If Airplan reports a configuration or setup error, tell the user it is not
  set up. Never inspect configuration files, credentials, or environment
  variables, and never try to configure Airplan or switch its backend.
- For any other failure, report the error and stop.

## More help

For usage beyond these workflows, run `airplan --help` and follow the CLI's
current instructions.
