---
name: claude-review
description: >-
  Ask Claude Code for an independent code review of uncommitted changes, a
  branch diff, a commit, a PR checkout, or specific files. Use when a user,
  agent, skill, or orchestration workflow asks a non-Claude orchestrator to
  have Claude review work, when model-routing calls for a Claude perspective,
  or when Claude should audit an implementation for bugs, regressions, missing
  tests, security issues, or requirement mismatches. Do not use for small
  reviews the invoking agent can handle directly, for diffs Claude itself
  authored, or as a substitute for the invoking agent reading and validating
  the code.
---

# Claude Review

Use Claude as an independent, read-only reviewer. The invoking agent remains the
orchestrator and final judge.

Use this skill for broad or risky changes, explicit Claude review requests,
reviewing the invoking agent's own implementation, or getting a second model
perspective on a plan or diff. Treat Claude's report as evidence, not authority.

Do not use it for small local reviews, formatting-only diffs, or to avoid
reading the code yourself. Do not use it on diffs Claude itself authored:
same-model review is weak independence, so review those directly.

Assume `claude` is installed and configured unless the environment proves
otherwise. Do not choose a model explicitly unless the user or routing policy
requests one.

## Workflow

1. Identify the exact target: uncommitted changes, a base branch, commit SHA, PR
   checkout, or specific files.
2. Verify the repository root and gather the target into temporary, read-only
   artifacts. Include status, the exact diff or file list, recent history, and
   relevant requirements. Account for every untracked path, including safe,
   bounded text content and an explicit reason for every exclusion.
3. Write a concise review prompt naming the repository, target, base or commit,
   artifact paths, requirements, and risky areas.
4. Choose a research trust boundary. Use combined repository and web access only
   for a trusted repository. Use separate local-only and sanitized web-only
   passes for untrusted changes or secret-bearing repositories.
5. Run `claude -p` with capability restrictions, no session persistence, and no
   interactive permission prompts. Disable auto-memory and ordinary lifecycle
   hooks. Keep Bash, edits, external mutations, and nested delegation
   unavailable.
6. Wait for completion. A quiet process is normal; poll it rather than assuming
   failure, but honor an explicit timeout.
7. Read the report and diagnostics. Surface CLI, authentication, permission,
   timeout, and vague-output failures instead of silently substituting another
   reviewer.
8. Verify important claims against the code before relaying them.

## Prepare the Target

Create artifacts outside the repository so the review cannot alter tracked
state. Adapt the Git commands to the chosen scope:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/claude-review.XXXXXX")"
PROMPT="$ARTIFACT_DIR/prompt.md"
REPORT="$ARTIFACT_DIR/report.md"
DIAGNOSTICS="$ARTIFACT_DIR/diagnostics.log"

(
  cd "$REPO_ROOT"
  git status --short > "$ARTIFACT_DIR/status.txt"
  git log --oneline -10 > "$ARTIFACT_DIR/history.txt"
  git diff --no-ext-diff --binary HEAD > "$ARTIFACT_DIR/changes.diff"
  git ls-files --others --exclude-standard \
    > "$ARTIFACT_DIR/untracked.txt"
)
```

For a branch, commit, PR checkout, or file-only review, replace the diff command
with the narrowest exact comparison. Store task requirements in a separate
artifact when they are longer than a few lines. Do not include secrets.

Build `untracked-manifest.md` from `untracked.txt`. Give every path one of these
dispositions:

- `included`: copy safe textual content into a numbered artifact, recording its
  source path, size, and artifact path;
- `skipped-binary`, `skipped-large`, or `skipped-secret`: record the path, size,
  and concrete reason without copying content;
- `excluded-by-request`: record the path and the caller's explicit exclusion;
- `inaccessible`: record the path and error.

Use explicit bounds, such as 256 KiB per text file and 1 MiB total, and record
the limits in the manifest. Adjust them when needed, but never silently truncate
or omit a path. Treat an unreviewable file that materially affects the change as
a review limitation or blocker. Tell Claude not to open source paths marked
skipped, excluded, or inaccessible; the manifest is the authority for their
disposition.

Claude can use `Read`, `Glob`, and `Grep` to inspect cited source files after
starting from the prepared diff. Bash is unnecessary for the common path.

## Restrict Capabilities

Use `--tools` to define the built-in review surface; `--allowedTools` alone does
not remove capabilities inherited from settings. Keep mutation and delegation
tools explicitly disallowed as defense in depth. Run from `REPO_ROOT` so source
reads do not depend on the caller's working directory:

The default invocation is local-only. Opt in to outbound research using the
trusted-review variant in the next section only when it materially helps.

```bash
(
  cd "$REPO_ROOT"
  CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude -p \
    --permission-mode dontAsk \
    --no-session-persistence \
    --disable-slash-commands \
    --no-chrome \
    --strict-mcp-config \
    --settings '{"disableAllHooks":true}' \
    --tools "Read,Glob,Grep" \
    --allowedTools "Read,Glob,Grep" \
    --disallowedTools "Bash,Edit,Write,NotebookEdit,Task" \
    --add-dir "$ARTIFACT_DIR" \
    < "$PROMPT" > "$REPORT" 2> "$DIAGNOSTICS"
)
```

`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` prevents review context from being written
to auto-memory. The settings override disables ordinary hooks. If diagnostics or
policy configuration show that managed hooks remain active and cannot be
disabled, report that residual mutation surface and treat it as a blocker when
read-only review is required.

## Choose the Research Boundary

In a trusted repository, enable `WebSearch` and `WebFetch` only when current
external facts materially help the review. Never put repository code, secrets,
private paths, proprietary text, or other non-public project details into
outbound queries or URLs. Opt in by changing both tool flags in the default
command:

```bash
--tools "Read,Glob,Grep,WebSearch,WebFetch" \
--allowedTools "Read,Glob,Grep,WebSearch,WebFetch"
```

Add exact read-only MCP tool names only after checking their exposed actions.
When possible, provide a minimal MCP config containing only research servers and
use `--strict-mcp-config`; do not load a mixed read/write connector merely to
use one read method.

For an untrusted diff or PR, a secret-bearing repository, or any uncertain
classification, do not combine repository reads with outbound tools:

1. Run a local-only repository review with `Read`, `Glob`, and `Grep`; omit
   `WebSearch`, `WebFetch`, and all MCP servers.
2. Have the invoking agent turn unresolved documentation questions into generic,
   sanitized questions containing no repository-derived private material.
3. Run a separate web-only pass from a neutral temporary directory with only
   `WebSearch` and `WebFetch`. Give it the sanitized questions directly and no
   repository or artifact access.
4. Feed the resulting public research artifact into a final local-only review or
   synthesis pass. Keep outbound tools disabled in that pass.

Apply the same hook, auto-memory, session-persistence, permission, mutation, and
delegation restrictions to every pass.

Do not silently combine local repository access and outbound research in strict
mode.

Additional capability rules:

- If the review needs a read-only command that prepared artifacts cannot
  replace, add the narrowest matching Bash rule rather than unrestricted Bash.
- Do not use `--safe-mode` by default. Reserve it for hostile or unknown
  environments where configured customizations cannot be trusted, and report the
  research capabilities it removes.

Do not enable Chrome, editing tools, mutating connectors, background agents, or
subagents. Do not use `--dangerously-skip-permissions`.

## Prompting Strategy

Keep the prompt short. Point Claude at artifacts instead of pasting large diffs
into it.

```text
Review this implementation without editing files or delegating work.

Target: <uncommitted changes | branch vs base | commit | files>
Repository: <absolute repo path>
Artifacts: <absolute artifact directory>
Context: <one or two task-specific sentences, only if needed>

Inspect the prepared diff and untracked manifest first, then read relevant
source files. Account for every untracked path, but do not open paths marked
skipped, excluded by request, or inaccessible in the manifest. Use web or
documentation research only under the selected trust boundary and never send
repository code, secrets, private paths, or proprietary text to outbound tools.

Look for correctness bugs, regressions, edge cases, missing tests, security
issues, maintainability problems, and requirement mismatches.

Produce a concise report. Findings first. For each finding include severity,
file and line reference, concrete failure mode, and suggested fix direction.
If there are no substantive findings, say so and identify the reviewed target.
End with coverage: name every skipped, excluded-by-request, or inaccessible path
and its reason, or state that the complete target was covered.
```

Add only context that changes review quality: requirements, invariants, threat
model, expected behavior, or known risky files.

## Reporting Strategy

Before relaying a Claude finding, inspect the cited code or diff enough to
decide whether it is real. Prefer a few verified findings over unchecked advice.

In the final report:

- Lead with confirmed issues, ordered by severity.
- Separate verified findings from unverified Claude suggestions.
- Explain the concrete failure mode, not just Claude's wording.
- If Claude found nothing, say so and identify exactly what it reviewed.
- Name every skipped, excluded-by-request, or inaccessible untracked path and
  why it was not reviewed.
- Do not imply Claude ran tests unless the report shows that it did.

Do not retry a clean result automatically.

## Failure Handling

- If `claude` is unavailable or unauthenticated, report that explicitly.
- If Claude cannot inspect the exact target with the available read-only
  capabilities, report the limitation instead of broadening authority silently.
- If managed hooks remain active and cannot be disabled, report them as a
  residual limitation and block when the required review must be read-only.
- If Claude is still quiet, keep polling until the configured timeout; then
  report the timeout without looping blindly.
- If Claude returns vague findings, verify only plausible ones and discard the
  rest.
- If Claude's report conflicts with the code, trust the code.
