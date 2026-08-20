#!/usr/bin/env python3
"""Detect local filesystem objects a rebase transition could overwrite."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path, PurePosixPath


def git(*args: str, allowed_returncodes: tuple[int, ...] = (0,)) -> bytes:
    environment = os.environ.copy()
    environment["GIT_LITERAL_PATHSPECS"] = "1"
    environment["GIT_OPTIONAL_LOCKS"] = "0"
    result = subprocess.run(
        ["git", *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=environment,
    )
    if result.returncode not in allowed_returncodes or result.stderr:
        message = result.stderr.decode(errors="replace").strip()
        raise RuntimeError(message or f"git {' '.join(args)} failed")
    return result.stdout


def repository_ignores_case() -> bool:
    value = git(
        "config",
        "--bool",
        "--get",
        "core.ignorecase",
        allowed_returncodes=(0, 1),
    ).strip()
    if value not in {b"", b"true", b"false"}:
        raise RuntimeError("invalid core.ignorecase value")
    return value == b"true"


def revision(value: str) -> str:
    return git("rev-parse", "--verify", f"{value}^{{commit}}").decode().strip()


def nul_paths(*args: str) -> set[bytes]:
    return {path for path in git(*args).split(b"\0") if path}


def changed_paths(old: str, new: str) -> set[bytes]:
    return nul_paths("diff", "--name-only", "-z", "--no-renames", old, new)


def parse_name_status(data: bytes) -> list[tuple[bytes, list[bytes]]]:
    if data and not data.endswith(b"\0"):
        raise RuntimeError("unterminated diff --name-status output")
    fields = data[:-1].split(b"\0") if data else []
    records: list[tuple[bytes, list[bytes]]] = []
    index = 0
    while index < len(fields):
        status = fields[index]
        index += 1
        if status in {b"A", b"D", b"M", b"T"}:
            path_count = 1
        elif status.startswith((b"R", b"C")):
            score = status[1:]
            if not score.isdigit() or not 0 <= int(score) <= 100:
                raise RuntimeError("malformed rename or copy score")
            path_count = 2
        else:
            raise RuntimeError("unsupported diff --name-status record")
        if index + path_count > len(fields):
            raise RuntimeError("malformed diff --name-status output")
        paths = fields[index : index + path_count]
        index += path_count
        if any(not path for path in paths):
            raise RuntimeError("empty path in diff --name-status output")
        records.append((status, paths))
    return records


def directory_rename_pairs(old: str, new: str) -> set[tuple[bytes, bytes]]:
    data = git(
        "diff",
        "--name-status",
        "-z",
        "--find-renames=50%",
        old,
        new,
    )
    pairs: set[tuple[bytes, bytes]] = set()
    prefix_evidence: dict[tuple[PurePosixPath, PurePosixPath], int] = {}
    for status, paths in parse_name_status(data):
        if not status.startswith(b"R"):
            continue

        old_parent = PurePosixPath(os.fsdecode(paths[0])).parent
        new_parent = PurePosixPath(os.fsdecode(paths[1])).parent
        if old_parent == PurePosixPath("."):
            continue

        old_parts = old_parent.parts
        new_parts = new_parent.parts
        candidate_pairs = {(old_parent, new_parent)}
        for trim_count in range(1, min(len(old_parts), len(new_parts)) + 1):
            if old_parts[-trim_count:] != new_parts[-trim_count:]:
                continue
            source_parts = old_parts[:-trim_count]
            if not source_parts:
                continue
            target_parts = new_parts[:-trim_count]
            prefix_pair = (
                PurePosixPath(*source_parts),
                PurePosixPath(*target_parts),
            )
            prefix_evidence[prefix_pair] = (
                prefix_evidence.get(prefix_pair, 0) + 1
            )
        pairs.update(
            (
                os.fsencode(str(source)),
                b"" if target == PurePosixPath(".") else os.fsencode(str(target)),
            )
            for source, target in candidate_pairs
            if source != target
        )
    pairs.update(
        (
            os.fsencode(str(source)),
            b"" if target == PurePosixPath(".") else os.fsencode(str(target)),
        )
        for (source, target), evidence_count in prefix_evidence.items()
        if source != target and evidence_count >= 2
    )
    return pairs


def relocated_path(
    path: bytes, source: bytes, destination: bytes
) -> bytes | None:
    if path == source:
        return destination or None
    prefix = source + b"/"
    if path.startswith(prefix):
        separator = b"/" if destination else b""
        return destination + separator + path[len(prefix) :]
    return None


def expanded_paths(
    paths: set[bytes], mappings: set[tuple[bytes, bytes]]
) -> set[bytes]:
    expanded = set(paths)
    frontier = set(paths)
    for _ in mappings:
        additions = {
            relocated
            for path in frontier
            for source, destination in mappings
            if (relocated := relocated_path(path, source, destination)) is not None
        } - expanded
        if not additions:
            break
        expanded.update(additions)
        frontier = additions
    return expanded


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
    transitions = replay_transitions(pre_head, base_head)
    target_paths = changed_paths(*transitions[0])
    candidates = set(target_paths)
    active_paths = set(target_paths)
    structural_roots: set[bytes] = set()
    merge_base = git("merge-base", pre_head, base_head).decode().strip()
    upstream_mappings = directory_rename_pairs(merge_base, base_head)

    for transition_index, (old, new) in enumerate(transitions):
        transition_paths = changed_paths(old, new)
        candidates.update(transition_paths)
        if transition_index:
            upstream_relocated = expanded_paths(
                transition_paths, upstream_mappings
            )
            replay_relocated = expanded_paths(
                active_paths, directory_rename_pairs(old, new)
            )
            candidates.update(upstream_relocated, replay_relocated)
            active_paths.update(
                transition_paths, upstream_relocated, replay_relocated
            )
        nodes = set().union(*(ancestors(path) for path in transition_paths))
        for node in nodes:
            if tree_type(old, node) == b"tree" and tree_type(new, node) != b"tree":
                structural_roots.add(node)
    return candidates, structural_roots


def tracked_nodes(pre_head: str) -> set[bytes]:
    files = nul_paths("ls-tree", "-r", "-z", "--name-only", pre_head)
    files.update(nul_paths("ls-files", "-z"))
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


def comparable(path: bytes, ignore_case: bool) -> str:
    value = os.fsdecode(path)
    return value.casefold() if ignore_case else value


def related(left: bytes, right: bytes, ignore_case: bool) -> bool:
    left_value = comparable(left, ignore_case)
    right_value = comparable(right, ignore_case)
    return (
        left_value == right_value
        or left_value.startswith(right_value + "/")
        or right_value.startswith(left_value + "/")
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
    ignore_case = repository_ignores_case()

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
        if related(candidate, local_path, ignore_case)
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
