#!/usr/bin/env python3
"""Detect local objects an exact candidate tree would overwrite."""

from __future__ import annotations

import hashlib
import os
import stat
import subprocess
import sys
import unicodedata
from pathlib import Path, PurePosixPath
from typing import NamedTuple


class TreeEntry(NamedTuple):
    object_type: bytes
    object_id: bytes
    object_mode: bytes


class DirectoryEntries(NamedTuple):
    names: frozenset[bytes]
    by_inode: dict[tuple[int, int], tuple[bytes, ...]]


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


def has_flagged_entries() -> bool:
    for record in git("ls-files", "-v", "-z").split(b"\0"):
        if not record:
            continue
        if len(record) < 3 or record[1:2] != b" ":
            raise RuntimeError("malformed ls-files flag output")
        tag = record[:1]
        if tag == b"S" or tag.islower():
            return True
    return False


def tracked_worktree_differs(current_head: str) -> bool:
    current = tree_entries(current_head)
    object_format = git("rev-parse", "--show-object-format").decode().strip()
    regular_files: list[tuple[bytes, bytes, os.stat_result]] = []
    checked_directories: dict[bytes, bool] = {}

    def ancestors_are_directories(path: bytes) -> bool:
        directory = b"."
        for component in path.split(b"/")[:-1]:
            directory = os.path.join(directory, component)
            if directory not in checked_directories:
                try:
                    mode = os.lstat(directory).st_mode
                except OSError:
                    checked_directories[directory] = False
                else:
                    checked_directories[directory] = stat.S_ISDIR(mode) and not stat.S_ISLNK(
                        mode
                    )
            if not checked_directories[directory]:
                return False
        return True

    def blob_id(data: bytes) -> bytes:
        digest = hashlib.new(object_format)
        digest.update(f"blob {len(data)}\0".encode())
        digest.update(data)
        return digest.hexdigest().encode()

    for path, entry in current.items():
        if entry.object_type != b"blob":
            continue
        if not ancestors_are_directories(path):
            return True
        try:
            path_stat = os.lstat(path)
        except OSError:
            return True

        if entry.object_mode == b"120000":
            if not stat.S_ISLNK(path_stat.st_mode):
                return True
            target = os.readlink(path)
            if not isinstance(target, bytes) or blob_id(target) != entry.object_id:
                return True
        elif entry.object_mode in {b"100644", b"100755"}:
            if not stat.S_ISREG(path_stat.st_mode):
                return True
            executable = bool(path_stat.st_mode & stat.S_IXUSR)
            if executable != (entry.object_mode == b"100755"):
                return True
            regular_files.append((path, entry.object_id, path_stat))
        else:
            raise RuntimeError("unsupported tracked blob mode")

    batch: list[tuple[bytes, bytes, os.stat_result]] = []
    batch_size = 0

    def compare_batch() -> bool:
        if not batch:
            return False
        hashes = git("hash-object", "--", *(os.fsdecode(item[0]) for item in batch))
        object_ids = hashes.splitlines()
        if len(object_ids) != len(batch):
            raise RuntimeError("malformed hash-object output")
        for (path, expected, before), actual in zip(batch, object_ids, strict=True):
            try:
                after = os.lstat(path)
            except OSError:
                return True
            stable_fields = ("st_dev", "st_ino", "st_mode", "st_size", "st_mtime_ns", "st_ctime_ns")
            if actual != expected or any(
                getattr(before, field) != getattr(after, field) for field in stable_fields
            ):
                return True
        return False

    for item in regular_files:
        item_size = len(item[0]) + 1
        if batch and batch_size + item_size > 65536:
            if compare_batch():
                return True
            batch = []
            batch_size = 0
        batch.append(item)
        batch_size += item_size
    return compare_batch()


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


def repository_normalizes_unicode() -> bool:
    value = git(
        "config",
        "--bool",
        "--get",
        "core.precomposeunicode",
        allowed_returncodes=(0, 1),
    ).strip()
    if value not in {b"", b"true", b"false"}:
        raise RuntimeError("invalid core.precomposeunicode value")
    return value == b"true"


def filesystem_alias_behavior(paths: dict[bytes, TreeEntry]) -> tuple[bool, bool]:
    ignores_case = False
    normalizes_unicode = False
    directory_entries: dict[bytes, DirectoryEntries] = {}

    def entries(directory: bytes) -> DirectoryEntries:
        if directory not in directory_entries:
            names = os.listdir(directory)
            mutable_by_inode: dict[tuple[int, int], list[bytes]] = {}
            for name in names:
                entry_stat = os.lstat(os.path.join(directory, name))
                key = (entry_stat.st_dev, entry_stat.st_ino)
                mutable_by_inode.setdefault(key, []).append(name)
            directory_entries[directory] = DirectoryEntries(
                frozenset(names),
                {key: tuple(value) for key, value in mutable_by_inode.items()},
            )
        return directory_entries[directory]

    for path in sorted(paths, key=lambda value: (value.count(b"/"), value)):
        directory = b"."
        for component in path.split(b"/"):
            directory_index = entries(directory)
            actual = component if component in directory_index.names else None
            if actual is None:
                requested_path = os.path.join(directory, component)
                try:
                    requested_stat = os.lstat(requested_path)
                except FileNotFoundError:
                    break
                matches = directory_index.by_inode.get(
                    (requested_stat.st_dev, requested_stat.st_ino), ()
                )
                if not matches:
                    raise RuntimeError("filesystem alias resolution changed during scan")
                actual = matches[0]
                requested_text = os.fsdecode(component)
                actual_text = os.fsdecode(actual)
                requested_nfd = unicodedata.normalize("NFD", requested_text)
                actual_nfd = unicodedata.normalize("NFD", actual_text)
                same_folded_nfd = (
                    actual_nfd.casefold() == requested_nfd.casefold()
                )
                if not same_folded_nfd:
                    raise RuntimeError("unsupported filesystem path aliasing")
                ignores_case |= actual_nfd != requested_nfd
                normalizes_unicode |= (
                    actual_text.casefold() != requested_text.casefold()
                )

            actual_path = os.path.join(directory, actual)
            actual_stat = os.lstat(actual_path)
            if stat.S_ISLNK(actual_stat.st_mode) or not stat.S_ISDIR(
                actual_stat.st_mode
            ):
                break
            directory = actual_path

    return ignores_case, normalizes_unicode


def tree_entries(revision_name: str) -> dict[bytes, TreeEntry]:
    data = git("ls-tree", "-r", "-t", "-z", revision_name)
    entries: dict[bytes, TreeEntry] = {}
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
        entries[path] = TreeEntry(fields[1], fields[2], fields[0])
    return entries


def ancestors(path: bytes) -> set[bytes]:
    result: set[bytes] = set()
    parent = PurePosixPath(os.fsdecode(path)).parent
    while parent != PurePosixPath("."):
        result.add(os.fsencode(str(parent)))
        parent = parent.parent
    return result


def comparable(path: bytes, ignore_case: bool, normalize_unicode: bool) -> str:
    value = os.fsdecode(path)
    if normalize_unicode:
        value = unicodedata.normalize("NFD", value)
    if ignore_case:
        return value.casefold()
    return value


def normalized_entries(
    entries: dict[bytes, TreeEntry], ignore_case: bool, normalize_unicode: bool
) -> dict[str, TreeEntry]:
    result: dict[str, TreeEntry] = {}
    for path, entry in entries.items():
        key = comparable(path, ignore_case, normalize_unicode)
        if key in result:
            raise RuntimeError("normalized tree entries are ambiguous")
        result[key] = entry
    return result


def filesystem_objects(
    ignore_case: bool,
    normalize_unicode: bool,
    traversable_directories: set[str],
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
                and comparable(relative, ignore_case, normalize_unicode)
                in traversable_directories
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
    current_raw: dict[bytes, TreeEntry],
    current: dict[str, TreeEntry],
    ignore_case: bool,
    normalize_unicode: bool,
) -> bool:
    if path in current_raw:
        return current_raw[path].object_type != b"commit"
    key = comparable(path, ignore_case, normalize_unicode)
    if key not in current:
        return False

    try:
        local_stat = os.lstat(path)
    except OSError as error:
        raise RuntimeError(f"cannot inspect {os.fsdecode(path)!r}: {error}") from error

    for tracked_path in current_raw:
        if comparable(tracked_path, ignore_case, normalize_unicode) != key:
            continue
        if current_raw[tracked_path].object_type == b"commit":
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
    current_raw = tree_entries(current_head)
    candidate_raw = tree_entries(candidate_head)
    detected_case_alias, detected_unicode_alias = filesystem_alias_behavior(
        current_raw | candidate_raw
    )
    ignore_case = repository_ignores_case() or detected_case_alias
    normalize_unicode = (
        repository_normalizes_unicode() or detected_unicode_alias
    )
    current = normalized_entries(current_raw, ignore_case, normalize_unicode)
    candidate = normalized_entries(candidate_raw, ignore_case, normalize_unicode)
    candidate_ancestors = {
        comparable(parent, ignore_case, normalize_unicode)
        for path in candidate_raw
        for parent in ancestors(path)
    }
    traversable_directories = candidate_ancestors | {
        key for key, entry in candidate.items() if entry.object_type == b"tree"
    } | {
        key for key, entry in current.items() if entry.object_type == b"tree"
    }

    found: set[bytes] = set()
    for path, is_directory, is_empty in filesystem_objects(
        ignore_case, normalize_unicode, traversable_directories
    ):
        key = comparable(path, ignore_case, normalize_unicode)
        if is_current_tracked_object(
            path, current_raw, current, ignore_case, normalize_unicode
        ):
            continue

        current_entry = current.get(key)
        candidate_entry = candidate.get(key)
        candidate_type = (
            candidate_entry.object_type if candidate_entry is not None else None
        )
        changed_materialized_gitlink = (
            current_entry is not None
            and current_entry.object_type == b"commit"
            and (
                candidate_entry is None
                or candidate_entry.object_type != b"commit"
                or candidate_entry.object_id != current_entry.object_id
            )
        )
        unmaterialized_gitlink = (
            current_entry is not None
            and current_entry.object_type == b"commit"
            and is_directory
            and is_empty
        )
        ancestor_is_file = any(
            (
                entry := candidate.get(
                    comparable(parent, ignore_case, normalize_unicode)
                )
            )
            is not None
            and entry.object_type not in {b"tree", b"commit"}
            for parent in ancestors(path)
        )
        if unmaterialized_gitlink:
            continue
        if changed_materialized_gitlink:
            found.add(path)
            continue
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
        if has_flagged_entries():
            raise RuntimeError(
                "the original checkout has skip-worktree or assume-unchanged entries"
            )
        if tracked_worktree_differs(current_head):
            raise RuntimeError("tracked worktree no longer matches current head")
        found = collisions(current_head, candidate_head)
    except Exception as error:
        print(f"inconclusive: {error}", file=sys.stderr)
        return 1

    if not found:
        return 0
    for path in sorted(found):
        print(f"collision: local={os.fsdecode(path)!r}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
