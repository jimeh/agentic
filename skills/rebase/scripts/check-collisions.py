#!/usr/bin/env python3
"""Detect local objects an exact candidate tree would overwrite."""

from __future__ import annotations

import os
import subprocess
import sys
import unicodedata
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


def revision(value: str) -> str:
    return git("rev-parse", "--verify", f"{value}^{{commit}}").decode().strip()


def current_branch() -> str:
    value = git(
        "symbolic-ref",
        "--quiet",
        "--short",
        "HEAD",
        allowed_returncodes=(0, 1),
    ).decode().strip()
    if not value:
        raise RuntimeError("the original checkout is detached")
    return value


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


def tree_entries(revision_name: str) -> dict[bytes, bytes]:
    data = git("ls-tree", "-r", "-t", "-z", revision_name)
    entries: dict[bytes, bytes] = {}
    for record in (item for item in data.split(b"\0") if item):
        try:
            metadata, path = record.split(b"\t", 1)
        except ValueError as error:
            raise RuntimeError("malformed ls-tree output") from error
        fields = metadata.split(b" ")
        if len(fields) != 3 or fields[1] not in {b"blob", b"commit", b"tree"}:
            raise RuntimeError("malformed ls-tree metadata")
        if not path or path in entries:
            raise RuntimeError("invalid path in ls-tree output")
        entries[path] = fields[1]
    return entries


def ancestors(path: bytes) -> set[bytes]:
    result: set[bytes] = set()
    parent = PurePosixPath(os.fsdecode(path)).parent
    while parent != PurePosixPath("."):
        result.add(os.fsencode(str(parent)))
        parent = parent.parent
    return result


def comparable(path: bytes, ignore_case: bool) -> str:
    value = os.fsdecode(path)
    if ignore_case:
        return unicodedata.normalize("NFD", value).casefold()
    return value


def normalized_entries(
    entries: dict[bytes, bytes], ignore_case: bool
) -> dict[str, bytes]:
    result: dict[str, bytes] = {}
    for path, object_type in entries.items():
        key = comparable(path, ignore_case)
        if key in result:
            raise RuntimeError("case-folded tree entries are ambiguous")
        result[key] = object_type
    return result


def filesystem_objects(
    ignore_case: bool, traversable_directories: set[str]
) -> list[tuple[bytes, bool, bool]]:
    if os.sep != "/":
        raise RuntimeError("collision inspection requires a POSIX filesystem")

    objects: list[tuple[bytes, bool, bool]] = []

    def raise_walk_error(error: OSError) -> None:
        raise error

    for current, directories, files in os.walk(
        b".", topdown=True, followlinks=False, onerror=raise_walk_error
    ):
        if current == b".":
            directories[:] = [name for name in directories if name != b".git"]
            files = [name for name in files if name != b".git"]

        retained_directories: list[bytes] = []
        for name in directories:
            path = os.path.join(current, name)
            relative = os.path.relpath(path, b".")
            is_link = os.path.islink(path)
            is_empty = False
            if not is_link:
                with os.scandir(path) as entries:
                    is_empty = next(entries, None) is None
            objects.append((relative, not is_link, is_empty))
            if (
                not is_link
                and comparable(relative, ignore_case) in traversable_directories
            ):
                retained_directories.append(name)
        directories[:] = retained_directories

        objects.extend(
            (os.path.relpath(os.path.join(current, name), b"."), False, False)
            for name in files
        )
    return objects


def is_current_tracked_object(
    path: bytes,
    current_raw: dict[bytes, bytes],
    current: dict[str, bytes],
    ignore_case: bool,
) -> bool:
    if path in current_raw:
        return True
    key = comparable(path, ignore_case)
    if key not in current:
        return False

    try:
        local_stat = os.lstat(path)
    except OSError as error:
        raise RuntimeError(f"cannot inspect {os.fsdecode(path)!r}: {error}") from error

    for tracked_path in current_raw:
        if comparable(tracked_path, ignore_case) != key:
            continue
        try:
            tracked_stat = os.lstat(tracked_path)
        except FileNotFoundError:
            continue
        except OSError as error:
            raise RuntimeError(
                f"cannot inspect tracked path {os.fsdecode(tracked_path)!r}: {error}"
            ) from error
        if (local_stat.st_dev, local_stat.st_ino) == (
            tracked_stat.st_dev,
            tracked_stat.st_ino,
        ):
            return True
    return False


def collisions(current_head: str, candidate_head: str) -> set[bytes]:
    ignore_case = repository_ignores_case()
    current_raw = tree_entries(current_head)
    candidate_raw = tree_entries(candidate_head)
    current = normalized_entries(current_raw, ignore_case)
    candidate = normalized_entries(candidate_raw, ignore_case)
    candidate_ancestors = {
        comparable(parent, ignore_case)
        for path in candidate_raw
        for parent in ancestors(path)
    }
    traversable_directories = candidate_ancestors | {
        key for key, object_type in candidate.items() if object_type == b"tree"
    } | {
        key for key, object_type in current.items() if object_type == b"tree"
    }

    found: set[bytes] = set()
    for path, is_directory, is_empty in filesystem_objects(
        ignore_case, traversable_directories
    ):
        key = comparable(path, ignore_case)
        if is_current_tracked_object(path, current_raw, current, ignore_case):
            continue

        candidate_type = candidate.get(key)
        ancestor_is_file = any(
            candidate.get(comparable(parent, ignore_case))
            not in {None, b"tree", b"commit"}
            for parent in ancestors(path)
        )
        if is_directory:
            if (
                candidate_type not in {None, b"tree", b"commit"}
                or ancestor_is_file
                or (is_empty and key in candidate_ancestors)
            ):
                found.add(path)
        elif (
            candidate_type is not None
            or key in candidate_ancestors
            or ancestor_is_file
        ):
            found.add(path)
    return found


def main() -> int:
    if len(sys.argv) != 4:
        print(
            "usage: check-collisions.py "
            "<current-head> <candidate-head> <expected-branch>",
            file=sys.stderr,
        )
        return 1

    try:
        root = Path(os.fsdecode(git("rev-parse", "--show-toplevel").strip()))
        os.chdir(root)
        current_head = revision(sys.argv[1])
        candidate_head = revision(sys.argv[2])
        expected_branch = sys.argv[3]
        if revision("HEAD") != current_head:
            raise RuntimeError("HEAD no longer matches the inspected current head")
        if current_branch() != expected_branch:
            raise RuntimeError("current branch no longer matches the recorded branch")
        if git("status", "--porcelain=v2", "-z", "--untracked-files=all"):
            raise RuntimeError("the original checkout is no longer clean")
        found = collisions(current_head, candidate_head)
    except (OSError, RuntimeError) as error:
        print(f"inconclusive: {error}", file=sys.stderr)
        return 1

    if not found:
        return 0
    for path in sorted(found):
        print(f"collision: local={os.fsdecode(path)!r}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
