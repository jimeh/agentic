# Runtime ownership and verification

Use this for harness work involving services, applications, devices, or
concurrent worktrees. Skip it for projects with no relevant runtime resources.
Inspect configuration and helpers before executing them. Harness work does not
authorize access to production or live user data; obtain explicit authorization
before such access, including read-only snapshots.

## Establish resource ownership

Trace the resources relevant to the observed failure: processes, ports, sockets,
data directories, databases, fixture accounts, credentials, caches, and build
outputs. Determine how the project identifies their owning checkout or run and
which are intentionally shared. Shared read-only caches need different rules
from mutable application state.

Inspect configuration precedence, including launcher variables and environment
files. Prefer defaults that select isolated state and refuse an ambiguous
destructive target. A worktree name or path-derived port alone does not prove
ownership or prevent collisions.

Startup output should identify the resolved instance, configuration source,
state directory, and bound addresses needed for diagnosis. Redact secrets and
tokens. Verify readiness through the client or protocol actually used; a live
process or HTTP response may not prove that the intended client can connect.

Cleanup must establish ownership before stopping a process or deleting state.
Prefer process handles or run records to broad name matching. Define whether the
run owns children, remote shares, temporary credentials, and disposable data,
and handle partial startup failures as well as normal shutdown.

## Verify the whole task lifecycle

For repeated stateful verification, make these decisions discoverable through
existing commands or a project-local procedure:

- How setup selects isolated state and proves the client reached that instance.
- How authentication is established and expired credentials are recovered.
- Which fixture and interaction exercise the intended behavior.
- Which observable condition proves readiness, progress, and completion.
- How interrupted work resumes and what evidence survives for review.
- When retained processes and fixtures expire, and who performs cleanup.

Retain useful state across review turns when the task requires it, with a clear
cleanup boundary. Do not assume one assistant turn is the environment lifetime.
Promote a repeated conditional procedure to a project-local verification skill
when authorized; keep simple commands as commands.

Synchronize on events, receipts, callbacks, process output or exit, queue
drains, or asserted state. If no direct signal exists, poll the actual condition
under a bounded deadline and report the last observed state on timeout. Fixed
sleeps do not establish completion. For absence assertions, first prove the
operation started, then observe through a meaningful completion or ordering
boundary. Prefer controllable clocks for time-dependent behavior.

## Choose fixtures by the property they preserve

Identify what a fresh toy fixture misses: migration history, relationship shape,
data volume, concurrency, or platform behavior. Use synthetic fixtures or a
generator when they preserve that property sufficiently.

When an authorized snapshot is necessary, use a consistency-aware read-only
source path and a separate development target. Apply the project's policy for
personal data, secrets, and retention. Removing authentication tables alone does
not sanitize arbitrary user content. Strip runtime leases and credentials that
would connect the copy to real services. Preserve only the history and
relationships the test needs.

Refuse to replace a target used by a running instance. For non-disposable state,
provide a backup or recovery path before replacement. Never point development
code at the snapshot's live source.

## Verify the ownership boundary

Use focused cases justified by the change, such as two concurrent worktrees, an
occupied port, inherited shared-state configuration, interrupted startup, or
cleanup after a partial failure. Check both the intended operation and the
protected neighboring resource. Report untested platform or device boundaries
instead of treating configuration inspection as runtime proof.
