#!/usr/bin/env python3
"""Detect local filesystem objects a rebase transition could overwrite."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path, PurePosixPath


def git(*args: str, check: bool = True) -> bytes:
    environment = os.environ.copy()
    environment["GIT_LITERAL_PATHSPECS"] = "1"
    result = subprocess.run(
        ["git", *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=environment,
    )
    if check and (result.returncode != 0 or result.stderr):
        message = result.stderr.decode(errors="replace").strip()
        raise RuntimeError(message or f"git {' '.join(args)} failed")
    return result.stdout


def revision(value: str) -> str:
    return git("rev-parse", "--verify", f"{value}^{{commit}}").decode().strip()


def nul_paths(*args: str) -> set[bytes]:
    return {path for path in git(*args).split(b"\0") if path}


def changed_paths(old: str, new: str) -> set[bytes]:
    return nul_paths("diff", "--name-only", "-z", "--no-renames", old, new)


def replay_transitions(pre_head: str, base_head: str) -> list[tuple[str, str]]:
    transitions = [(pre_head, base_head)]
    merge_base = git("merge-base", pre_head, base_head).decode().strip()
    commits = git(
        "rev-list", "--reverse", "--no-merges", f"{merge_base}..{pre_head}"
    ).decode().splitlines()
    for commit in commits:
        parent = git("rev-parse", f"{commit}^").decode().strip()
        transitions.append((parent, commit))
    return transitions


def tree_type(revision_name: str, path: bytes) -> bytes | None:
    output = git("ls-tree", "-z", revision_name, "--", os.fsdecode(path))
    if not output:
        return None
    metadata = output.split(b"\t", 1)[0]
    fields = metadata.split(b" ")
    if len(fields) < 2 or fields[1] not in {b"blob", b"commit", b"tree"}:
        raise RuntimeError(
            f"malformed ls-tree output for {revision_name}:{os.fsdecode(path)}"
        )
    return fields[1]


def transition_state(
    pre_head: str, base_head: str
) -> tuple[set[bytes], set[bytes]]:
    candidates: set[bytes] = set()
    structural_roots: set[bytes] = set()
    for old, new in replay_transitions(pre_head, base_head):
        transition_paths = changed_paths(old, new)
        candidates.update(transition_paths)
        nodes = set().union(*(ancestors(path) for path in transition_paths))
        for node in nodes:
            if tree_type(old, node) == b"tree" and tree_type(new, node) != b"tree":
                structural_roots.add(node)
    return candidates, structural_roots


def tracked_nodes(pre_head: str) -> set[bytes]:
    files = nul_paths("ls-tree", "-r", "-z", "--name-only", pre_head)
    nodes = set(files)
    for path in files:
        parent = PurePosixPath(os.fsdecode(path)).parent
        while parent != PurePosixPath("."):
            nodes.add(os.fsencode(str(parent)))
            parent = parent.parent
    return nodes


def status_objects() -> set[bytes]:
    records = git(
        "status",
        "--porcelain=v2",
        "-z",
        "--untracked-files=all",
        "--ignored=matching",
    ).split(b"\0")
    return {
        record[2:].rstrip(b"/")
        for record in records
        if record.startswith((b"? ", b"! ")) and record[2:]
    }


def ancestors(path: bytes) -> set[bytes]:
    result = {path}
    parent = PurePosixPath(os.fsdecode(path)).parent
    while parent != PurePosixPath("."):
        result.add(os.fsencode(str(parent)))
        parent = parent.parent
    return result


def related(left: bytes, right: bytes) -> bool:
    return (
        left == right
        or left.startswith(right + b"/")
        or right.startswith(left + b"/")
    )


def extra_descendants(root: bytes, tracked: set[bytes]) -> set[bytes]:
    if not os.path.isdir(root) or os.path.islink(root):
        return set()

    extra: set[bytes] = set()
    def raise_walk_error(error: OSError) -> None:
        raise error

    for current, directories, files in os.walk(
        root, followlinks=False, onerror=raise_walk_error
    ):
        for name in [*directories, *files]:
            path = os.path.join(current, name)
            if path not in tracked:
                extra.add(path)
    return extra


def collisions(pre_head: str, base_head: str) -> set[tuple[bytes, bytes]]:
    candidates, structural_roots = transition_state(pre_head, base_head)
    tracked = tracked_nodes(pre_head)
    local = status_objects()

    for candidate in candidates:
        for node in ancestors(candidate):
            if node in tracked:
                continue
            if os.path.lexists(node):
                local.add(node)

    for root in structural_roots:
        local.update(extra_descendants(root, tracked))

    return {
        (candidate, local_path)
        for candidate in candidates
        for local_path in local
        if related(candidate, local_path)
    }


def main() -> int:
    if len(sys.argv) != 3:
        print(
            "usage: check-collisions.py <pre-rebase-head> <base-head>",
            file=sys.stderr,
        )
        return 1

    try:
        root = Path(os.fsdecode(git("rev-parse", "--show-toplevel").strip()))
        os.chdir(root)
        pre_head = revision(sys.argv[1])
        base_head = revision(sys.argv[2])
        found = collisions(pre_head, base_head)
    except (OSError, RuntimeError) as error:
        print(f"inconclusive: {error}", file=sys.stderr)
        return 1

    if not found:
        return 0

    for candidate, local_path in sorted(found):
        print(
            "collision: "
            f"candidate={os.fsdecode(candidate)!r} "
            f"local={os.fsdecode(local_path)!r}"
        )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
