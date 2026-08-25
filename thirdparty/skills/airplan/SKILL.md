---
name: airplan
description: >-
  Upload agent-produced documents, document bundles, or file collections with
  airplan and return shareable links. Use when the user explicitly asks for a
  link to a document, screenshot, recording, or other produced file, or when
  authorized pull request or issue work explicitly calls for linkable visual
  evidence. Do not upload merely because an artifact exists or might be
  convenient.
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

### Document bundles

Use a document bundle when one entry document provides the primary narrative
and supporting Markdown, source-code pages, images, recordings, or downloads
belong with it:

```sh
airplan --json README.md \
  docs/design.md \
  examples/server.go \
  images/flow.svg \
  recordings/demo.webm
```

Run the command from the entry file's project. Every page and asset must remain
beneath the entry directory, including after resolving symlinks. Airplan adds
Markdown and UTF-8 source files to built-in navigation and uploads recognized
opaque resources unchanged. It prefers a root `README.md`, then `index.md`, then
the first Markdown file as the entry. Use `--entrypoint`, `--page`, or `--asset`
to override inference. Read `.url`
for the entry, `.pages[].url` for managed pages, and `.assets[].url` for assets.
Do not use a bundle for peer evidence files with no primary narrative; use a
collection instead.

With MCP, use inline `upload_document` for generated text and small assets. Use
`upload_paths` when the local tool can infer a mixed local file set, or
`upload_document_files` when explicit document roles are preferable for screenshots,
recordings, or other files that should not be base64-buffered. Hosted MCP does
not expose local-file tools. Inline MCP assets have a 32 MiB decoded aggregate
limit; use the local-file tool or REST for larger assets.

### Revise an existing document

When the user asks to revise an existing Airplan plan, use the existing link
as the revision target instead of creating an unrelated upload:

```sh
airplan new-revision --json <airplan-url> plan.md
```

Any surviving URL in the chain is valid; Airplan resolves the latest live
revision before comparing content. Deleted revisions remain numbered
tombstones, are omitted from navigation, and are reported as unavailable when
targeted. The input filename stem must resolve to the existing document slug;
reuse the original filename or pass the revised Markdown through stdin. Return
the resulting revision URL. Byte-identical content is a successful no-op and
does not consume a revision number. Linked pages expose
one compact revision selector above the rendered content and server-generated
adjacent changes. Older pages are visibly labeled with their revision while
the latest is labeled `(Latest)`. A bundle revision is complete replacement:
resupply every page and asset that should remain. Anyone
who can read one linked URL learns the capability URLs for the surviving
revision history. With MCP, use `new_document_revision` for inline input or
`new_document_revision_files` when local files are available. The CLI
`update` name and MCP `update_document` tool remain compatibility names, but
new workflows should use the revision-named interfaces.

### Upgrade rendered documents

When the user explicitly asks to refresh an existing Airplan document's
rendering, preview the upgrade first and apply only after the target and change
are clear:

```sh
airplan upgrade --check <airplan-url>
airplan upgrade <airplan-url>
```

Use `airplan upgrade --all --dry-run` to inspect eligible records in the active
local manifest. Bulk mutation requires explicit authorization and confirmation;
never run `--all --yes` opportunistically. Use `--all-profiles` only when the
user explicitly wants every configured profile included.

An upgrade re-renders a source-backed Markdown upload in place. It is not a new
document revision and does not create revision history or
`.airplan-versions.json`. If the harness provides MCP tools, use
`upgrade_document` or `upgrade_documents`; both preview by default and require
`apply: true` to mutate.

Markdown preserves authored raw HTML and link destinations, while HTML is
uploaded as authored. Both may execute active content when opened, so upload
only trusted documents. Repository discovery is local and uses the input
file's Git repository first; keep the command rooted in the relevant project
when uploading a temporary file.

## Screenshots, recordings, and other files

When a document is the primary narrative, include its supporting evidence in
the same command and use `--asset` only for ambiguous UTF-8 resources. When the files are peers with no primary
document, upload related evidence in one invocation so it becomes one
collection and one cleanup unit:

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

Multiple named files without Markdown or HTML automatically form a collection.
A single recognized media or binary file does too. Use `--collection` to force
any named set into a collection. `--files` remains a compatibility alias.

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
