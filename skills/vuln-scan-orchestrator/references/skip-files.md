# Durable skip files

Before planning a scan, read all skip files under `security/vuln-scan/skips/`,
if that directory exists.

Use one Markdown file per canonical issue under a stable issue slug. Treat these
files as human-authored notes that may be created or edited by either people or
agents.

Do not require YAML frontmatter, fixed headings, or a strict schema. Future
scans should read skip files heuristically by extracting useful signals from the
title, headings, bullets, code references, file paths, and prose.

Useful signals include:

- issue title or close aliases
- vulnerability class or category
- affected components, subsystems, or paths
- distinctive behavioral details that identify the issue
- why it is skipped
- what changes should invalidate the skip and force re-review

Agents may create or update skip files, but they should keep them concise,
readable, and easy for humans to maintain in git.

When an agent creates or updates a skip file, it should prefer plain Markdown
with a short title and compact prose or bullets over a rigid machine template.
If the user has an obvious local convention for skip files, follow that
convention instead of inventing a new format.

Match candidate findings against skip files by:

1. issue title or recognizable aliases
2. nearby cited paths, components, subsystems, or code references
3. whether the current finding still fits the same underlying behavior and
   rationale

If the match is still accurate and the code has not materially changed, mark the
finding as skipped and reference the skip file path instead of fully
re-evaluating it.

If the code appears materially changed, the finding is broader than the saved
rationale, the distinguishing details no longer line up, or the title match is
weak, do not silently suppress it. Record it as `skip needs review` and verify
it normally.

If the user later says a specific issue should be ignored by future scans or is
a false positive, create or update the matching skip file instead of creating a
new run. The skip file should describe the issue pattern itself well enough for
future scans to recognize the same underlying finding without relying on
run-local finding IDs or paths inside `security/vuln-scan/<run-id>/...`.

## Follow-up mode

If the user asks to mark a finding as ignored in future scans, or says it is a
false positive or accepted risk:

1. Find the matching issue from `verified-results.md` when present; otherwise
   fall back to `findings-summary.md`.
2. Create or update `security/vuln-scan/skips/<issue-slug>.md`.
3. Write a concise Markdown note that describes:
   - the issue title or close aliases
   - whether it is a false positive or accepted risk
   - the affected components or paths
   - the distinguishing behavior that future scans should match
   - why it is being skipped
   - what kinds of code changes should invalidate the skip
4. Do not rely on run-local finding IDs or per-run artifact paths as the durable
   identifier for the skip.

If the user's reference to the issue is ambiguous, use the most likely matching
finding and state that assumption clearly.
