package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// settingsFile represents the relevant subset of a Claude Code
// settings.json file.
type settingsFile struct {
	Permissions struct {
		Allow []string `json:"allow"`
		Deny  []string `json:"deny"`
	} `json:"permissions"`
}

// loadPermissions merges allow/deny patterns from all relevant
// Claude Code settings files.
func loadPermissions(cwd string) (
	allow, deny []string, err error,
) {
	return loadPermissionsFromPaths(settingsPaths(cwd))
}

// settingsPaths returns the ordered list of settings files to
// check for permission patterns.
func settingsPaths(cwd string) []string {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}
	return []string{
		filepath.Join(home, ".claude", "settings.json"),
		filepath.Join(cwd, ".claude", "settings.json"),
		filepath.Join(
			cwd, ".claude", "settings.local.json",
		),
	}
}

// loadPermissionsFromPaths reads and merges permissions from the
// given settings file paths. Missing or invalid files are
// silently skipped.
func loadPermissionsFromPaths(paths []string) (
	allow, deny []string, err error,
) {
	for _, p := range paths {
		a, d, ferr := readSettingsFile(p)
		if ferr != nil {
			continue
		}
		allow = append(allow, a...)
		deny = append(deny, d...)
	}
	return allow, deny, nil
}

func readSettingsFile(path string) (
	allow, deny []string, err error,
) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, nil, err
	}

	var sf settingsFile
	if err := json.Unmarshal(data, &sf); err != nil {
		return nil, nil, err
	}
	return sf.Permissions.Allow, sf.Permissions.Deny, nil
}

// matchesAnyPattern returns true if command matches at least one
// of the given Bash(...) patterns.
func matchesAnyPattern(command string, patterns []string) bool {
	for _, p := range patterns {
		if matchesPattern(command, p) {
			return true
		}
	}
	return false
}

// matchesPattern checks a command against a single Bash(...)
// permission pattern using a 4-tier matching strategy:
//  1. Legacy `:*` suffix → word-boundary prefix match
//  2. ` *` suffix (no other `*`) → word-boundary prefix match
//  3. `*` anywhere → glob match
//  4. No wildcards → exact match
func matchesPattern(command, pattern string) bool {
	inner, ok := extractBashPattern(pattern)
	if !ok {
		return false
	}

	// 1. Legacy `:*` suffix — word-boundary prefix match.
	if prefix, ok := strings.CutSuffix(inner, ":*"); ok {
		return command == prefix ||
			strings.HasPrefix(command, prefix+" ")
	}

	// 2. ` *` suffix with no other `*` — word-boundary prefix.
	if prefix, ok := strings.CutSuffix(inner, " *"); ok {
		if !strings.Contains(prefix, "*") {
			return command == prefix ||
				strings.HasPrefix(command, prefix+" ")
		}
	}

	// 3. `*` anywhere — glob match.
	if strings.Contains(inner, "*") {
		return globMatch(inner, command)
	}

	// 4. No wildcards — exact match.
	return command == inner
}

// globMatch implements classic glob-style matching where `*`
// matches any sequence of zero or more characters.
func globMatch(pattern, text string) bool {
	px, tx := 0, 0
	starPx, starTx := -1, -1

	for tx < len(text) {
		if px < len(pattern) && pattern[px] == '*' {
			starPx = px
			starTx = tx
			px++
			continue
		}
		if px < len(pattern) && pattern[px] == text[tx] {
			px++
			tx++
			continue
		}
		if starPx >= 0 {
			starTx++
			tx = starTx
			px = starPx + 1
			continue
		}
		return false
	}

	for px < len(pattern) && pattern[px] == '*' {
		px++
	}
	return px == len(pattern)
}

// extractBashPattern returns the inner content of a Bash(...)
// wrapper, or false if the pattern isn't a Bash pattern.
func extractBashPattern(pattern string) (string, bool) {
	if !strings.HasPrefix(pattern, "Bash(") {
		return "", false
	}
	if !strings.HasSuffix(pattern, ")") {
		return "", false
	}
	return pattern[5 : len(pattern)-1], true
}
