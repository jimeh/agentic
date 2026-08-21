#!/usr/bin/env bash
set -euo pipefail
umask 077

if [ "$#" -ne 6 ]; then
  printf 'usage: log.sh <trail.tsv> <phase> <decision> <rationale> <evidence> <outcome>\n' >&2
  exit 1
fi

trail="$1"
shift

case "$trail" in
  */*)
    trail_dir="${trail%/*}"
    if [ -z "$trail_dir" ]; then
      trail_dir="/"
    fi
    ;;
  *) trail_dir="." ;;
esac
if [ "$trail_dir" != "." ] && [ ! -d "$trail_dir" ]; then
  mkdir -p -- "$trail_dir"
fi

header='ts	phase	decision	rationale	evidence	outcome'
if [ ! -s "$trail" ]; then
  printf '%s\n' "$header" > "$trail"
else
  existing_header=""
  IFS= read -r existing_header < "$trail" || true
  if [ "$existing_header" != "$header" ]; then
    printf 'refusing to append: unexpected decision-trail header in %s\n' "$trail" >&2
    exit 1
  fi
  if ! awk -F '\t' 'NR > 1 && (NF != 6 || $1 == "") { exit 1 }' < "$trail"; then
    printf 'refusing to append: malformed decision-trail row in %s\n' "$trail" >&2
    exit 1
  fi
  final_byte="$(tail -c 1 < "$trail" | od -An -tu1 | tr -d '[:space:]')"
  if [ "$final_byte" != "10" ]; then
    printf 'refusing to append: decision trail lacks a final newline in %s\n' "$trail" >&2
    exit 1
  fi
fi

clean_cell() {
  local value
  value="$(printf '%s' "$1" | tr '\t\n\r' '   ')"
  case "$value" in
    =* | +* | -* | @*) printf "'%s" "$value" ;;
    *) printf '%s' "$value" ;;
  esac
}

timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$timestamp" \
  "$(clean_cell "$1")" \
  "$(clean_cell "$2")" \
  "$(clean_cell "$3")" \
  "$(clean_cell "$4")" \
  "$(clean_cell "$5")" >> "$trail"
