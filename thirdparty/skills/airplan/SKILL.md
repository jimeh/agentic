---
name: airplan
description: >-
  Upload an agent-produced plan, specification, report, or other referenced
  file with airplan and return a browser-ready link. Use only when the user
  explicitly asks for a link to a file or document the agent has produced,
  such as "give me a link to the plan" or "share the spec as a link". Do not
  use merely because a document is complete or ready for review.
---

# airplan

Use `airplan` only when the user explicitly asks for a link to a plan, spec, or
other file they have clearly referenced and the agent has produced. Do not
upload a document merely because it is finished or would be easier to review in
a browser.

## Workflow

1. Identify the exact file the user asked to receive as a link.
2. Run `airplan <file>`.
3. Treat stdout as the resulting URL. Present it to the user as a clickable
   link.

```sh
airplan plan.md
# → https://plans.example.com/vq3nhk2p7r4wzt5c6ydjm3xhqd/plan.html
```

Upload only the referenced file. Anyone with the resulting link can read it,
and the upload persists until deleted. Markdown preserves authored raw HTML and
link destinations, while HTML is uploaded as authored. Both may execute active
content when opened, so only upload the exact trusted file the user requested.
For Markdown, airplan recognizes YAML/TOML frontmatter titles and automatically
links issue and commit references using the file's GitHub origin. If the file
is outside Git, it falls back to the invocation directory, so keep the command
rooted in the relevant project when uploading a temporary plan file.

## Failure handling

- If airplan reports a configuration or setup error, tell the user that airplan
  is not set up. Never inspect configuration files, credentials, or environment
  variables, and never try to configure airplan.
- For any other failure, report the error and stop.
- Never fabricate or reuse a URL after a failed command.

## More help

For usage beyond `airplan <file>`, run `airplan --help` and follow the CLI's
current instructions.
