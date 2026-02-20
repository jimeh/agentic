package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// settingsFile represents the relevant subset of a Claude Code
// settings.json file.
type settingsFile struct {
	Permissions struct {
		Allow []string `json:"allow"`
		Ask   []string `json:"ask"`
		Deny  []string `json:"deny"`
	} `json:"permissions"`
	AllowManagedPermissionRulesOnly bool `json:"allowManagedPermissionRulesOnly"`
}

type settingsScope string

const (
	scopeManaged settingsScope = "managed"
	scopeLocal   settingsScope = "local"
	scopeProject settingsScope = "project"
	scopeUser    settingsScope = "user"
)

type settingsSource struct {
	path  string
	scope settingsScope
}

type permissionRules struct {
	allow       []string
	ask         []string
	deny        []string
	managedOnly bool
}

var managedSettingsPathResolver = managedSettingsPathByOS

// loadPermissions merges permission patterns from all relevant Claude Code
// settings files, failing closed on any active-source uncertainty.
func loadPermissions(cwd string) (permissionRules, error) {
	sources, err := settingsPaths(cwd)
	if err != nil {
		return permissionRules{}, err
	}
	return loadPermissionsFromPaths(sources)
}

// settingsPaths returns the ordered list of settings sources to check for
// permission patterns.
func settingsPaths(cwd string) ([]settingsSource, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("resolve home directory: %w", err)
	}

	return settingsPathsFor(cwd, home, runtime.GOOS), nil
}

func settingsPathsFor(
	cwd, home, goos string,
) []settingsSource {
	paths := make([]settingsSource, 0, 4)
	if managedPath, ok := managedSettingsPathResolver(goos); ok {
		paths = append(paths, settingsSource{
			path:  managedPath,
			scope: scopeManaged,
		})
	}

	return append(paths,
		settingsSource{
			path: filepath.Join(
				cwd, ".claude", "settings.local.json",
			),
			scope: scopeLocal,
		},
		settingsSource{
			path: filepath.Join(
				cwd, ".claude", "settings.json",
			),
			scope: scopeProject,
		},
		settingsSource{
			path: filepath.Join(
				home, ".claude", "settings.json",
			),
			scope: scopeUser,
		},
	)
}

func managedSettingsPathByOS(goos string) (string, bool) {
	switch goos {
	case "darwin":
		return filepath.Join(
			"/Library", "Application Support", "ClaudeCode",
			"managed-settings.json",
		), true
	case "linux":
		return filepath.Join(
			"/etc", "claude-code", "managed-settings.json",
		), true
	case "windows":
		return `C:\Program Files\ClaudeCode\managed-settings.json`, true
	default:
		return "", false
	}
}

// loadPermissionsFromPaths reads and merges permissions from the given
// settings sources. Missing files are skipped. Any active-source read, parse,
// or validation error fails closed.
func loadPermissionsFromPaths(
	paths []settingsSource,
) (permissionRules, error) {
	var merged permissionRules

	for _, src := range paths {
		if merged.managedOnly &&
			src.scope != scopeManaged {
			// Managed-only mode disables lower scopes for permission rules.
			continue
		}

		rules, ferr := readSettingsFile(src.path)
		if ferr != nil {
			if os.IsNotExist(ferr) {
				continue
			}
			return permissionRules{}, fmt.Errorf(
				"read %s settings %q: %w",
				src.scope, src.path, ferr,
			)
		}

		if ferr := validatePatterns(rules.allow); ferr != nil {
			return permissionRules{}, fmt.Errorf(
				"validate allow patterns in %q: %w",
				src.path, ferr,
			)
		}
		if ferr := validatePatterns(rules.ask); ferr != nil {
			return permissionRules{}, fmt.Errorf(
				"validate ask patterns in %q: %w",
				src.path, ferr,
			)
		}
		if ferr := validatePatterns(rules.deny); ferr != nil {
			return permissionRules{}, fmt.Errorf(
				"validate deny patterns in %q: %w",
				src.path, ferr,
			)
		}

		if src.scope == scopeManaged &&
			rules.managedOnly {
			merged.managedOnly = true
		}

		merged.allow = append(merged.allow, rules.allow...)
		merged.ask = append(merged.ask, rules.ask...)
		merged.deny = append(merged.deny, rules.deny...)
	}

	return merged, nil
}

func validatePatterns(patterns []string) error {
	for _, p := range patterns {
		if err := validatePattern(p); err != nil {
			return err
		}
	}
	return nil
}

func validatePattern(pattern string) error {
	if !strings.HasPrefix(pattern, "Bash(") {
		return nil
	}

	inner, ok := extractBashPattern(pattern)
	if !ok {
		return fmt.Errorf("invalid Bash pattern %q", pattern)
	}
	if strings.TrimSpace(inner) == "" {
		return fmt.Errorf("empty Bash pattern %q", pattern)
	}
	return nil
}

func readSettingsFile(path string) (permissionRules, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return permissionRules{}, err
	}

	var sf settingsFile
	if err := json.Unmarshal(data, &sf); err != nil {
		return permissionRules{}, err
	}

	return permissionRules{
		allow:       sf.Permissions.Allow,
		ask:         sf.Permissions.Ask,
		deny:        sf.Permissions.Deny,
		managedOnly: sf.AllowManagedPermissionRulesOnly,
	}, nil
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
