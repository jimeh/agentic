#!/usr/bin/env bash

set -euo pipefail

files=()
for file in "$@"; do
  [[ "${file}" == thirdparty/* ]] && continue
  files+=("${file}")
done

if [[ "${#files[@]}" -eq 0 ]]; then
  exit 0
fi

mise exec -- oxfmt --check "${files[@]}"
mise exec -- markdownlint-cli2 "${files[@]}"
