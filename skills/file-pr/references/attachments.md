# GitHub attachments

Read this before publishing a pull request, issue, or comment that carries a
screenshot or screen recording. `gh` uploads local image and video files itself
through `--attach`, so this evidence needs no separate host.

## Requirements

`--attach` exists from `gh` 2.99.0 on `gh pr create`, `gh pr edit`,
`gh pr comment`, `gh issue create`, `gh issue edit`, and `gh issue comment`. It
needs GitHub.com or GitHub Enterprise Cloud and write access to the target
repository. It therefore fails on GitHub Enterprise Server and on a pull request
to a repository the account cannot push to. Reviews and inline review comments
cannot carry attachments; put the file in a pull request comment instead.

It accepts PNG, JPEG, GIF, WebP, SVG, MP4, MOV, and WebM files, up to 50 per
command. An image may be 10 MB. A video may be 10 MB in a repository on a free
plan and 100 MB on a paid one, so keep recordings short. The command's `--help`
has the current rules.

## Review every file first

An upload cannot be undone, and removing the reference later does not remove the
file. Anyone who can read the repository can open it, and a file in a public
repository needs no authentication. Before attaching:

- Open each image and watch each recording. Check for credentials, tokens,
  private data, usernames, unrelated windows, and browser chrome.
- Crop or recapture so the file shows only the state the text describes.
- Keep capture files outside the working tree so they are never committed.

## Reference each file in the body

Write each file into the body where it supports the text, using the same path
that `--attach` receives:

```md
![Settings page with the new sync toggle enabled](/tmp/pr-evidence/settings.png)
```

`gh` replaces the path with the uploaded URL and keeps the alt text. It appends
a file the body does not reference to the end of the body. In a description that
lands after the attribution footer and any bot-managed section, so reference
every file there. An appended file is acceptable in a comment.

- `gh` matches on the resolved path, and a relative path resolves against the
  command's working directory, not the body file's location. Absolute paths
  avoid the mismatch.
- Write alt text that says what the image shows. The `<file>#<alt text>` flag
  form applies only to an appended file.
- Put a recording's reference alone in its own paragraph. There it renders as a
  player; anywhere else it becomes a link. A video takes no alt text.
- `gh` leaves a path inside a code fence or inline code span unchanged.

```sh
gh pr create --base main --head feat/sync-toggle --title "$title" \
  --body-file "$body_file" \
  --attach /tmp/pr-evidence/before.png \
  --attach /tmp/pr-evidence/after.png
```

## Handle failures

`gh` checks the host, credential, and permission before it publishes anything.
When `--attach` is unavailable, remove the references from the body, publish
without the files, and report which evidence was left out and why. Do not upload
the files to another host unless the user asks; `airplan` covers that request.

When some files upload and others fail, `gh` still creates or updates the target
with the ones that succeeded, exits non-zero, and prints the target's URL. Treat
that as a published target, not a failed command:

- Do not run the create command again.
- The body still holds the local path of each failed file. Retry those files
  through `gh pr edit --attach` or `gh issue edit --attach`, which rewrites a
  reference left in the existing body. If the retry fails, remove the reference.
- Read the body back once and confirm that no local path remains.
