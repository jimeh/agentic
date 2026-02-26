#!/usr/bin/env bash

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYMLINKS=()
FORCE="false"

# Plugins to auto-install (plugin@marketplace format).
# Marketplace name is read from .claude-plugin/marketplace.json.
CLAUDE_PLUGINS=(
  "strip-git-cwd"
  "git-commands"
  "agents-md"
  "phased-work"
)

# ==============================================================================
# Symlink Discovery
# ==============================================================================

# Populate SYMLINKS array with all source|target pairs.
discover_symlinks() {
  # Rules file → multiple targets.
  SYMLINKS+=(
    "RULES.md|${HOME}/.claude/CLAUDE.md"
    "RULES.md|${HOME}/.agents/AGENTS.md"
    "RULES.md|${HOME}/.codex/AGENTS.md"
  )

  # Claude config files.
  SYMLINKS+=(
    "claude/settings.json|${HOME}/.claude/settings.json"
    "claude/keybindings.json|${HOME}/.claude/keybindings.json"
    "claude/statusline.sh|${HOME}/.claude/statusline.sh"
  )

  # Codex config files.
  SYMLINKS+=(
    "codex/config.toml|${HOME}/.codex/config.toml"
  )

  # Discover skills: skills/*/SKILL.md → both ~/.claude and ~/.agents
  local skill_dir
  for skill_dir in "${SCRIPT_DIR}/skills/"*/; do
    [[ -d "${skill_dir}" ]] || continue
    [[ -f "${skill_dir}/SKILL.md" ]] || continue
    local name
    name="$(basename "${skill_dir}")"
    SYMLINKS+=(
      "skills/${name}|${HOME}/.claude/skills/${name}"
      "skills/${name}|${HOME}/.agents/skills/${name}"
    )
  done
}

# ==============================================================================
# Logging
# ==============================================================================

info() {
  printf " \033[36mINFO:\033[0m %s\n" "$*" >&2
}

debug() {
  [[ -n "${DEBUG:-}" ]] && printf "\033[35mDEBUG:\033[0m %s\n" "$*" >&2
}

warn() {
  printf " \033[33mWARN:\033[0m %s\n" "$*" >&2
}

error() {
  printf "\033[31mERROR:\033[0m %s\n" "$*" >&2
}

fatal() {
  error "$@"
  exit 1
}

# ==============================================================================
# Symlink Utilities
# ==============================================================================

# Cross-platform function to resolve symlinks.
resolve_symlink() {
  local path="$1"
  if command -v realpath > /dev/null 2>&1; then
    realpath "$path"
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    if command -v python3 > /dev/null 2>&1; then
      python3 -c \
        "import os,sys; print(os.path.realpath(sys.argv[1]))" "$path"
    elif command -v python > /dev/null 2>&1; then
      python -c \
        "import os,sys; print(os.path.realpath(sys.argv[1]))" "$path"
    elif command -v perl > /dev/null 2>&1; then
      perl -MCwd=realpath -e 'print realpath(shift)' -- "$path"
    else
      readlink "$path"
    fi
  else
    readlink -f "$path"
  fi
}

# Backup existing file/symlink and create a new symlink.
backup_and_link() {
  local source="$1"
  local target="$2"

  # Create target directory if it doesn't exist.
  local target_dir
  target_dir="$(dirname "${target}")"
  mkdir -p "${target_dir}"

  # Check if target already exists.
  if [[ -e "${target}" || -L "${target}" ]]; then
    if [[ -L "${target}" ]]; then
      local real_target real_source
      real_target="$(resolve_symlink "$target")"
      real_source="$(resolve_symlink "$source")"
      if [[ "${real_target}" == "${real_source}" ]]; then
        info "skip ${target} (already linked)"
        return
      fi
    fi

    if [[ "${FORCE}" == "true" ]]; then
      info "backup ${target} → ${target}.bak"
      mv "${target}" "${target}.bak"
    else
      warn "skip ${target} (already exists, use --force)"
      return
    fi
  fi

  info "link ${source} → ${target}"
  ln -s "${source}" "${target}"
}

# ==============================================================================
# Symlink Creation
# ==============================================================================

create_symlinks() {
  local entry source target
  for entry in "${SYMLINKS[@]}"; do
    source="${entry%%|*}"
    target="${entry##*|}"
    backup_and_link "${SCRIPT_DIR}/${source}" "${target}"
  done
}

# ==============================================================================
# Stale Symlink Cleanup
# ==============================================================================

# Remove symlinks in target_dir that point into source_dir where the
# source no longer exists. Leaves symlinks managed by other tools alone.
_cleanup_stale_links() {
  local source_dir="$1"
  local target_dir="$2"

  [[ -d "${target_dir}" ]] || return

  local link
  for link in "${target_dir}"/*; do
    [[ -e "${link}" || -L "${link}" ]] || continue
    [[ -L "${link}" ]] || continue

    local target
    target="$(readlink "${link}")"

    # Only touch symlinks pointing into our source tree.
    if [[ "${target}" == "${source_dir}/"* && ! -e "${target}" ]]; then
      info "remove stale: ${link}"
      rm -f "${link}"
    fi
  done
}

cleanup_stale() {
  _cleanup_stale_links \
    "${SCRIPT_DIR}/claude/commands" "${HOME}/.claude/commands"
  _cleanup_stale_links \
    "${SCRIPT_DIR}/skills" "${HOME}/.claude/skills"
  _cleanup_stale_links \
    "${SCRIPT_DIR}/skills" "${HOME}/.agents/skills"
}

# ==============================================================================
# Claude Plugin Setup
# ==============================================================================

# Ensure a single marketplace is configured.
# Usage: _ensure_marketplace <name> <type> <source>
#   type: "github" or "directory"
#   source: GitHub "owner/repo" or local directory path
_ensure_marketplace() {
  local name="$1"
  local type="$2"
  local source="$3"

  local match
  match="$(
    echo "${_MARKETPLACES}" |
      jq -r ".[] | select(.name == \"${name}\") | .name // empty"
  )" || true

  if [[ -n "${match}" ]]; then
    # For directory marketplaces, warn if the path doesn't match.
    if [[ "${type}" == "directory" ]]; then
      local current_path
      current_path="$(
        echo "${_MARKETPLACES}" |
          jq -r ".[] | select(.name == \"${name}\") | .path // empty"
      )" || true
      if [[ -n "${current_path}" && "${current_path}" != "${source}" ]]; then
        warn "marketplace ${name} points to ${current_path}" \
          "(expected ${source})"
      fi
    fi
    info "skip marketplace ${name} (already configured)"
    return
  fi

  info "add marketplace ${name}"
  claude plugin marketplace add "${source}"

  # Refresh cached list after adding.
  _MARKETPLACES="$(claude plugin marketplace list --json 2> /dev/null)" || true
}

# Ensure a single plugin is installed.
# Usage: _ensure_plugin <plugin_id>
#   plugin_id: "name@marketplace" format
_ensure_plugin() {
  local plugin_id="$1"

  if echo "${_PLUGINS}" |
    jq -e ".[] | select(.id == \"${plugin_id}\")" \
      > /dev/null 2>&1; then
    info "skip plugin ${plugin_id} (already installed)"
    return
  fi

  info "install plugin ${plugin_id}"
  claude plugin install "${plugin_id}"

  # Refresh cached list after installing.
  _PLUGINS="$(claude plugin list --json 2> /dev/null)" || true
}

setup_claude_plugins() {
  if ! command -v claude > /dev/null 2>&1; then
    info "claude CLI not found, skipping plugin setup"
    return
  fi

  if ! command -v jq > /dev/null 2>&1; then
    warn "jq not found, skipping plugin setup"
    return
  fi

  # Read marketplace name from manifest.
  local manifest="${SCRIPT_DIR}/.claude-plugin/marketplace.json"
  if [[ ! -f "${manifest}" ]]; then
    warn "marketplace manifest not found, skipping plugin setup"
    return
  fi

  local marketplace
  marketplace="$(jq -r '.name' "${manifest}")"
  if [[ -z "${marketplace}" || "${marketplace}" == "null" ]]; then
    warn "marketplace name not found in manifest, skipping"
    return
  fi

  # Cache marketplace list for _ensure_marketplace calls.
  _MARKETPLACES="$(claude plugin marketplace list --json 2> /dev/null)" || true

  _ensure_marketplace \
    "claude-plugins-official" "github" "anthropics/claude-plugins-official"
  _ensure_marketplace \
    "${marketplace}" "directory" "${SCRIPT_DIR}"

  # Install plugins from CLAUDE_PLUGINS list.
  _PLUGINS="$(claude plugin list --json 2> /dev/null)" || true

  local plugin
  for plugin in "${CLAUDE_PLUGINS[@]}"; do
    _ensure_plugin "${plugin}@${marketplace}"
  done

  unset _MARKETPLACES _PLUGINS
}

# ==============================================================================
# Help
# ==============================================================================

show_help() {
  cat << 'EOF'
Usage: setup.sh [--force] [--help]

Options:
  --force    Replace existing files/symlinks (backs up to .bak)

Creates symlinks for Claude Code and agents configuration:

  RULES.md           → ~/.claude/CLAUDE.md
  RULES.md           → ~/.agents/AGENTS.md
  RULES.md           → ~/.codex/AGENTS.md
  claude/settings    → ~/.claude/settings.json
  claude/statusline  → ~/.claude/statusline.sh
  codex/config.toml  → ~/.codex/config.toml
  skills/*           → ~/.claude/skills/
  skills/*           → ~/.agents/skills/

Registers the local plugin marketplace and installs plugins
via the Claude CLI (skipped if claude or jq is not available).

Also removes stale skill symlinks (and legacy command symlinks).
EOF
}

# ==============================================================================
# Main
# ==============================================================================

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help | -h)
        show_help
        exit 0
        ;;
      --force | -f)
        FORCE="true"
        shift
        ;;
      *)
        error "Unknown argument: $1"
        echo >&2
        show_help
        exit 1
        ;;
    esac
  done

  info "Setting up symlinks..."
  discover_symlinks
  create_symlinks
  cleanup_stale

  info "Setting up Claude plugins..."
  setup_claude_plugins

  info "Done!"
}

main "$@"
