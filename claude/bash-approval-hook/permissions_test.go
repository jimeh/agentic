package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestExtractBashPattern(t *testing.T) {
	tests := []struct {
		name    string
		pattern string
		want    string
		wantOK  bool
	}{
		{
			name:    "prefix match pattern",
			pattern: "Bash(git status:*)",
			want:    "git status:*",
			wantOK:  true,
		},
		{
			name:    "exact match pattern",
			pattern: "Bash(npm run compile)",
			want:    "npm run compile",
			wantOK:  true,
		},
		{
			name:    "not a Bash pattern",
			pattern: "Read(./.env)",
			want:    "",
			wantOK:  false,
		},
		{
			name:    "missing closing paren",
			pattern: "Bash(git status",
			want:    "",
			wantOK:  false,
		},
		{
			name:    "empty inner",
			pattern: "Bash()",
			want:    "",
			wantOK:  true,
		},
		{
			name:    "Skill pattern",
			pattern: "Skill(commit-commands:commit:*)",
			want:    "",
			wantOK:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := extractBashPattern(tt.pattern)
			if ok != tt.wantOK || got != tt.want {
				t.Errorf(
					"extractBashPattern(%q) = (%q, %v), "+
						"want (%q, %v)",
					tt.pattern, got, ok, tt.want, tt.wantOK,
				)
			}
		})
	}
}

func TestGlobMatch(t *testing.T) {
	tests := []struct {
		name    string
		pattern string
		text    string
		want    bool
	}{
		{"exact match", "hello", "hello", true},
		{"exact mismatch", "hello", "world", false},
		{"star matches all", "*", "anything", true},
		{"star matches empty", "*", "", true},
		{"prefix star", "*world", "hello world", true},
		{"prefix star no match", "*world", "hello", false},
		{"suffix star", "hello*", "hello world", true},
		{"suffix star exact", "hello*", "hello", true},
		{"middle star", "git * main", "git push main", true},
		{
			"middle star no match",
			"git * main", "git push origin", false,
		},
		{
			"multiple stars",
			"*foo*bar*", "xxxfooYYYbarZZZ", true,
		},
		{
			"multiple stars no match",
			"*foo*bar*", "xxxfooYYY", false,
		},
		{"empty pattern empty text", "", "", true},
		{"empty pattern nonempty", "", "x", false},
		{
			"star matches path seps",
			"git*status", "git -C /foo status", true,
		},
		{
			"adjacent stars",
			"a**b", "aXYZb", true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := globMatch(tt.pattern, tt.text)
			if got != tt.want {
				t.Errorf(
					"globMatch(%q, %q) = %v, want %v",
					tt.pattern, tt.text,
					got, tt.want,
				)
			}
		})
	}
}

func TestMatchesPattern(t *testing.T) {
	tests := []struct {
		name    string
		command string
		pattern string
		want    bool
	}{
		{
			name:    "prefix match with args",
			command: "git status --short",
			pattern: "Bash(git status:*)",
			want:    true,
		},
		{
			name:    "prefix match exact prefix",
			command: "git status",
			pattern: "Bash(git status:*)",
			want:    true,
		},
		{
			name:    "prefix no match",
			command: "git push origin main",
			pattern: "Bash(git status:*)",
			want:    false,
		},
		{
			name:    "exact match",
			command: "npm run compile",
			pattern: "Bash(npm run compile)",
			want:    true,
		},
		{
			name:    "exact no match extra args",
			command: "npm run compile --watch",
			pattern: "Bash(npm run compile)",
			want:    false,
		},
		{
			name:    "non-Bash pattern",
			command: "git status",
			pattern: "Read(./.env)",
			want:    false,
		},
		{
			name:    "prefix must match word boundary",
			command: "git statusbar",
			pattern: "Bash(git status:*)",
			want:    false,
		},
		{
			name:    "git add prefix",
			command: "git add file.txt",
			pattern: "Bash(git add:*)",
			want:    true,
		},
		{
			name:    "git diff no args",
			command: "git diff",
			pattern: "Bash(git diff:*)",
			want:    true,
		},

		// ---- Space-star suffix (word-boundary prefix) ----
		{
			name:    "space-star with args",
			command: "npm run lint --fix",
			pattern: "Bash(npm run lint *)",
			want:    true,
		},
		{
			name:    "space-star exact prefix",
			command: "npm run lint",
			pattern: "Bash(npm run lint *)",
			want:    true,
		},
		{
			name:    "space-star no match",
			command: "npm run build",
			pattern: "Bash(npm run lint *)",
			want:    false,
		},
		{
			name:    "space-star word boundary",
			command: "npm run linting",
			pattern: "Bash(npm run lint *)",
			want:    false,
		},

		// ---- Bare-star suffix (glob, no word boundary) ----
		{
			name:    "bare-star suffix matches lsof",
			command: "lsof",
			pattern: "Bash(ls*)",
			want:    true,
		},
		{
			name:    "bare-star suffix matches ls -la",
			command: "ls -la",
			pattern: "Bash(ls*)",
			want:    true,
		},
		{
			name:    "bare-star suffix no match",
			command: "cat foo",
			pattern: "Bash(ls*)",
			want:    false,
		},

		// ---- Star at start ----
		{
			name:    "star-prefix matches",
			command: "node --version",
			pattern: "Bash(* --version)",
			want:    true,
		},
		{
			name:    "star-prefix no match",
			command: "node --help",
			pattern: "Bash(* --version)",
			want:    false,
		},

		// ---- Star in middle ----
		{
			name:    "star-middle matches",
			command: "git push main",
			pattern: "Bash(git * main)",
			want:    true,
		},
		{
			name:    "star-middle no match",
			command: "git push origin",
			pattern: "Bash(git * main)",
			want:    false,
		},

		// ---- Match-all ----
		{
			name:    "match-all star",
			command: "rm -rf /",
			pattern: "Bash(*)",
			want:    true,
		},
		{
			name:    "match-all empty command",
			command: "",
			pattern: "Bash(*)",
			want:    true,
		},

		// ---- Multiple wildcards ----
		{
			name:    "multiple wildcards match",
			command: "git -C /tmp push origin main",
			pattern: "Bash(git * push * main)",
			want:    true,
		},
		{
			name:    "multiple wildcards no match",
			command: "git -C /tmp push origin dev",
			pattern: "Bash(git * push * main)",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchesPattern(tt.command, tt.pattern)
			if got != tt.want {
				t.Errorf(
					"matchesPattern(%q, %q) = %v, want %v",
					tt.command, tt.pattern, got, tt.want,
				)
			}
		})
	}
}

func TestMatchesAnyPattern(t *testing.T) {
	patterns := []string{
		"Bash(git status:*)",
		"Bash(git diff:*)",
		"Bash(git log:*)",
		"Read(./.env)",
	}

	tests := []struct {
		name    string
		command string
		want    bool
	}{
		{"matches first", "git status", true},
		{"matches second", "git diff --cached", true},
		{"matches third", "git log --oneline", true},
		{"no match", "git push", false},
		{"non-git", "ls -la", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchesAnyPattern(tt.command, patterns)
			if got != tt.want {
				t.Errorf(
					"matchesAnyPattern(%q) = %v, want %v",
					tt.command, got, tt.want,
				)
			}
		})
	}
}

func TestMatchesAnyPatternEmpty(t *testing.T) {
	if matchesAnyPattern("git status", nil) {
		t.Error("expected false for nil patterns")
	}
	if matchesAnyPattern("git status", []string{}) {
		t.Error("expected false for empty patterns")
	}
}

func TestMatchesAnyPatternMixed(t *testing.T) {
	patterns := []string{
		"Bash(git status:*)",    // legacy
		"Bash(npm run lint *)",  // space-star
		"Bash(cargo test *)",    // space-star
		"Bash(* --version)",     // star-prefix glob
	}

	tests := []struct {
		name    string
		command string
		want    bool
	}{
		{"legacy match", "git status --short", true},
		{"space-star match", "npm run lint --fix", true},
		{"space-star exact", "cargo test", true},
		{"glob prefix match", "node --version", true},
		{"no match", "rm -rf /", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchesAnyPattern(tt.command, patterns)
			if got != tt.want {
				t.Errorf(
					"matchesAnyPattern(%q) = %v, want %v",
					tt.command, got, tt.want,
				)
			}
		})
	}
}

func TestReadSettingsFile(t *testing.T) {
	dir := t.TempDir()

	sf := settingsFile{}
	sf.Permissions.Allow = []string{
		"Bash(git status:*)",
		"Bash(git diff:*)",
	}
	sf.Permissions.Deny = []string{
		"Bash(git push:*)",
	}

	data, err := json.MarshalIndent(sf, "", "  ")
	if err != nil {
		t.Fatal(err)
	}

	path := filepath.Join(dir, "settings.json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}

	allow, deny, err := readSettingsFile(path)
	if err != nil {
		t.Fatalf("readSettingsFile: %v", err)
	}

	if len(allow) != 2 {
		t.Errorf("allow len = %d, want 2", len(allow))
	}
	if len(deny) != 1 {
		t.Errorf("deny len = %d, want 1", len(deny))
	}
	if allow[0] != "Bash(git status:*)" {
		t.Errorf("allow[0] = %q", allow[0])
	}
	if deny[0] != "Bash(git push:*)" {
		t.Errorf("deny[0] = %q", deny[0])
	}
}

func TestReadSettingsFileMissing(t *testing.T) {
	_, _, err := readSettingsFile("/nonexistent/settings.json")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestReadSettingsFileInvalid(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "settings.json")
	if err := os.WriteFile(
		path, []byte("not json"), 0o644,
	); err != nil {
		t.Fatal(err)
	}

	_, _, err := readSettingsFile(path)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestLoadPermissionsFromPaths(t *testing.T) {
	dir := t.TempDir()

	// First file with allow patterns.
	sf1 := settingsFile{}
	sf1.Permissions.Allow = []string{
		"Bash(git status:*)",
	}
	data1, _ := json.Marshal(sf1)
	f1 := filepath.Join(dir, "global.json")
	os.WriteFile(f1, data1, 0o644)

	// Second file with more allow and deny patterns.
	sf2 := settingsFile{}
	sf2.Permissions.Allow = []string{
		"Bash(git diff:*)",
	}
	sf2.Permissions.Deny = []string{
		"Bash(git push:*)",
	}
	data2, _ := json.Marshal(sf2)
	f2 := filepath.Join(dir, "project.json")
	os.WriteFile(f2, data2, 0o644)

	// Third file doesn't exist — should be skipped.
	f3 := filepath.Join(dir, "missing.json")

	allow, deny, err := loadPermissionsFromPaths(
		[]string{f1, f2, f3},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(allow) != 2 {
		t.Errorf("allow len = %d, want 2", len(allow))
	}
	if len(deny) != 1 {
		t.Errorf("deny len = %d, want 1", len(deny))
	}
}

func TestLoadPermissionsFromPathsAllMissing(t *testing.T) {
	allow, deny, err := loadPermissionsFromPaths(
		[]string{"/a", "/b", "/c"},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(allow) != 0 || len(deny) != 0 {
		t.Errorf(
			"expected empty, got allow=%v deny=%v",
			allow, deny,
		)
	}
}
