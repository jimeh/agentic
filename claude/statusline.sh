#!/bin/bash

# --- Color Constants ---
COLOR_DIR=245        # directory
COLOR_GIT_BRANCH=153 # light blue pastel
COLOR_GIT_STATUS=182 # pink pastel
COLOR_DIM=243        # dimmer text (lines, cost)
COLOR_SEP=242        # separators

# --- Utility Functions ---

# Print text in specified 256-color
colored() {
  printf "\033[38;5;%sm%s\033[0m" "$1" "$2"
}

# Print separator
sep() {
  colored $COLOR_SEP " · "
}

# Format token counts (e.g., 50k, 1.2M)
format_tokens() {
  local tokens=$1
  if [ "$tokens" -ge 1000000 ]; then
    awk "BEGIN {printf \"%.1fM\", $tokens/1000000}"
  elif [ "$tokens" -ge 1000 ]; then
    awk "BEGIN {printf \"%.0fk\", $tokens/1000}"
  else
    echo "$tokens"
  fi
}

# Return color code based on percentage threshold
# Args: $1 = percentage, $2 = base color (used when below warning threshold)
get_percentage_color() {
  local percent=$1
  local base_color=$2

  # 229 = light yellow, 221 = yellow, 214 = gold, 208 = orange
  if [ "$percent" -ge 98 ]; then
    echo 208
  elif [ "$percent" -ge 95 ]; then
    echo 214
  elif [ "$percent" -ge 90 ]; then
    echo 221
  elif [ "$percent" -ge 85 ]; then
    echo 229
  else
    echo "$base_color"
  fi
}

# --- Data Extraction ---

# Read stdin, save JSON, extract all fields into globals
parse_input() {
  INPUT=$(cat)

  MODEL=$(echo "$INPUT" | jq -r '.model.display_name')
  CWD=$(echo "$INPUT" | jq -r '.workspace.current_dir')
  PERCENT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0' |
    xargs printf "%.0f")
  TOTAL_INPUT=$(echo "$INPUT" | jq -r '.context_window.total_input_tokens // 0')
  TOTAL_OUTPUT=$(echo "$INPUT" | jq -r '.context_window.total_output_tokens // 0')
  TOTAL_TOKENS=$((TOTAL_INPUT + TOTAL_OUTPUT))
  CONTEXT_SIZE=$(echo "$INPUT" | jq -r '.context_window.context_window_size // 0')
  # Calculate currently loaded tokens from percentage
  CURRENT_TOKENS=$((CONTEXT_SIZE * PERCENT / 100))

  # Extract cost info
  COST_USD=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')
  LINES_ADDED=$(echo "$INPUT" | jq -r '.cost.total_lines_added // 0')
  LINES_REMOVED=$(echo "$INPUT" | jq -r '.cost.total_lines_removed // 0')
}

# --- Component Builders ---

# Get CWD, replace $HOME with ~
get_directory() {
  if [ -n "$CWD" ]; then
    DIR="$CWD"
  else
    DIR=$(pwd)
  fi

  # Replace home directory with tilde
  DIR="${DIR/#$HOME/~}"
}

# Get branch, status indicators, ahead/behind
get_git_info() {
  GIT_BRANCH=""
  GIT_STATUS=""
  GIT_AHEAD_BEHIND=""

  # Skip if not in a git repo (skip optional locks to avoid blocking)
  if [ ! -d "${CWD:-.}/.git" ] &&
    ! git -C "${CWD:-.}" rev-parse --git-dir > /dev/null 2>&1; then
    return
  fi

  # Get branch name
  GIT_BRANCH=$(git -C "${CWD:-.}" branch --show-current 2> /dev/null ||
    git -C "${CWD:-.}" rev-parse --short HEAD 2> /dev/null)

  [ -z "$GIT_BRANCH" ] && return

  # Get status indicators
  local git_dirty="" git_staged="" git_untracked=""

  # Check for staged changes
  if ! git -C "${CWD:-.}" diff --cached --quiet 2> /dev/null; then
    git_staged="+"
  fi

  # Check for unstaged changes
  if ! git -C "${CWD:-.}" diff --quiet 2> /dev/null; then
    git_dirty="!"
  fi

  # Check for untracked files
  if [ -n "$(git -C "${CWD:-.}" ls-files --others --exclude-standard 2> /dev/null)" ]; then
    git_untracked="?"
  fi

  # Combine status indicators
  GIT_STATUS="${git_staged}${git_dirty}${git_untracked}"

  # Get ahead/behind counts
  local upstream ahead behind
  upstream=$(git -C "${CWD:-.}" rev-parse --abbrev-ref '@{upstream}' 2> /dev/null)
  if [ -n "$upstream" ]; then
    ahead=$(git -C "${CWD:-.}" rev-list --count '@{upstream}..HEAD' 2> /dev/null)
    behind=$(git -C "${CWD:-.}" rev-list --count 'HEAD..@{upstream}' 2> /dev/null)

    if [ "$ahead" -gt 0 ]; then
      GIT_AHEAD_BEHIND="↑${ahead}"
    fi
    if [ "$behind" -gt 0 ]; then
      GIT_AHEAD_BEHIND="${GIT_AHEAD_BEHIND}↓${behind}"
    fi
  fi
}

# Build braille progress bar from PERCENT
build_progress_bar() {
  # Braille characters with 7 levels per cell
  # ⣀ (2) -> ⣄ (3) -> ⣤ (4) -> ⣦ (5) -> ⣶ (6) -> ⣷ (7) -> ⣿ (8 dots)
  local braille_chars=("⣀" "⣄" "⣤" "⣦" "⣶" "⣷" "⣿")
  local bar_width=10
  local levels=7
  local total_gradations=$((bar_width * levels))
  local current_gradation=$((PERCENT * total_gradations / 100))

  PROGRESS_BAR=""
  for ((i = 0; i < bar_width; i++)); do
    local cell_start=$((i * levels))
    local cell_fill=$((current_gradation - cell_start))

    if [ $cell_fill -le 0 ]; then
      # Empty cell
      PROGRESS_BAR+="${braille_chars[0]}"
    elif [ $cell_fill -ge $levels ]; then
      # Full cell
      PROGRESS_BAR+="${braille_chars[$((levels - 1))]}"
    else
      # Partial cell
      PROGRESS_BAR+="${braille_chars[$cell_fill]}"
    fi
  done
}

# --- Output ---

# Print the final formatted statusline
print_statusline() {
  local current_display total_display cost_display context_color

  current_display=$(format_tokens "$CURRENT_TOKENS")
  total_display=$(format_tokens "$TOTAL_TOKENS")

  # Determine context color based on percentage (ramps to warning colors)
  context_color=$(get_percentage_color "$PERCENT" $COLOR_DIM)

  # Format cost as $X.XX
  cost_display=$(awk "BEGIN {printf \"$%.2f\", $COST_USD}")

  # Directory
  colored $COLOR_DIR "$DIR"

  # Git info
  if [ -n "$GIT_BRANCH" ]; then
    printf " "
    colored $COLOR_GIT_BRANCH "$GIT_BRANCH"

    # Status indicators
    if [ -n "$GIT_STATUS" ]; then
      colored $COLOR_GIT_STATUS "$GIT_STATUS"
    fi

    # Ahead/behind
    if [ -n "$GIT_AHEAD_BEHIND" ]; then
      printf " "
      colored $COLOR_GIT_STATUS "$GIT_AHEAD_BEHIND"
    fi
  fi

  sep

  # Model (only if not default Opus 4.6)
  if [ "$MODEL" != "Opus 4.6" ]; then
    colored $COLOR_DIR "$MODEL"
    sep
  fi

  # Lines added/removed
  colored $COLOR_DIM "+$LINES_ADDED"
  colored $COLOR_SEP "/"
  colored $COLOR_DIM "-$LINES_REMOVED"
  sep

  # Progress bar and percentage (dynamic color based on context usage)
  colored "$context_color" "$PROGRESS_BAR $PERCENT%"
  sep

  # Token counts (dynamic color based on context usage)
  colored "$context_color" "$current_display/$total_display"
  sep

  # Cost
  colored $COLOR_DIM "$cost_display"
}

# --- Entry Point ---

main() {
  parse_input
  get_directory
  get_git_info
  build_progress_bar
  print_statusline
}

main "$@"
