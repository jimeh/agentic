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
		"Bash(git status:*)",   // legacy
		"Bash(npm run lint *)", // space-star
		"Bash(cargo test *)",   // space-star
		"Bash(* --version)",    // star-prefix glob
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

func TestSettingsPathsFor(t *testing.T) {
	cwd := "/repo/project"
	home := "/users/alice"

	tests := []struct {
		name             string
		goos             string
		wantManagedPath  string
		wantManagedScope bool
	}{
		{
			name: "darwin includes managed first",
			goos: "darwin",
			wantManagedPath: filepath.Join(
				"/Library",
				"Application Support",
				"ClaudeCode",
				"managed-settings.json",
			),
			wantManagedScope: true,
		},
		{
			name:             "linux includes managed first",
			goos:             "linux",
			wantManagedPath:  "/etc/claude-code/managed-settings.json",
			wantManagedScope: true,
		},
		{
			name:             "windows includes managed first",
			goos:             "windows",
			wantManagedPath:  `C:\Program Files\ClaudeCode\managed-settings.json`,
			wantManagedScope: true,
		},
		{
			name:             "unknown os omits managed",
			goos:             "plan9",
			wantManagedScope: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			managedSettingsPathResolver = managedSettingsPathByOS
			paths := settingsPathsFor(cwd, home, tt.goos)

			wantLen := 3
			if tt.wantManagedScope {
				wantLen = 4
			}
			if len(paths) != wantLen {
				t.Fatalf("len(paths) = %d, want %d", len(paths), wantLen)
			}

			offset := 0
			if tt.wantManagedScope {
				if paths[0].scope != scopeManaged {
					t.Fatalf(
						"paths[0].scope = %q, want %q",
						paths[0].scope, scopeManaged,
					)
				}
				if paths[0].path != tt.wantManagedPath {
					t.Fatalf(
						"paths[0].path = %q, want %q",
						paths[0].path, tt.wantManagedPath,
					)
				}
				offset = 1
			}

			want := []settingsSource{
				{
					path: filepath.Join(
						cwd, ".claude", "settings.local.json",
					),
					scope: scopeLocal,
				},
				{
					path: filepath.Join(
						cwd, ".claude", "settings.json",
					),
					scope: scopeProject,
				},
				{
					path: filepath.Join(
						home, ".claude", "settings.json",
					),
					scope: scopeUser,
				},
			}

			for i, w := range want {
				got := paths[i+offset]
				if got.scope != w.scope || got.path != w.path {
					t.Fatalf(
						"paths[%d] = %+v, want %+v",
						i+offset, got, w,
					)
				}
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
	sf.Permissions.Ask = []string{
		"Bash(git commit:*)",
	}
	sf.Permissions.Deny = []string{
		"Bash(git push:*)",
	}
	sf.AllowManagedPermissionRulesOnly = true

	data, err := json.MarshalIndent(sf, "", "  ")
	if err != nil {
		t.Fatal(err)
	}

	path := filepath.Join(dir, "settings.json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}

	rules, err := readSettingsFile(path)
	if err != nil {
		t.Fatalf("readSettingsFile: %v", err)
	}

	if len(rules.allow) != 2 {
		t.Errorf("allow len = %d, want 2", len(rules.allow))
	}
	if len(rules.ask) != 1 {
		t.Errorf("ask len = %d, want 1", len(rules.ask))
	}
	if len(rules.deny) != 1 {
		t.Errorf("deny len = %d, want 1", len(rules.deny))
	}
	if !rules.managedOnly {
		t.Error("managedOnly = false, want true")
	}
}

func TestReadSettingsFileMissing(t *testing.T) {
	_, err := readSettingsFile("/nonexistent/settings.json")
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

	_, err := readSettingsFile(path)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestLoadPermissionsFromPaths(t *testing.T) {
	dir := t.TempDir()

	sf1 := settingsFile{}
	sf1.Permissions.Allow = []string{
		"Bash(git status:*)",
	}
	sf1.Permissions.Ask = []string{
		"Bash(git commit:*)",
	}
	data1, err := json.Marshal(sf1)
	if err != nil {
		t.Fatal(err)
	}
	f1 := filepath.Join(dir, "user.json")
	if err := os.WriteFile(f1, data1, 0o644); err != nil {
		t.Fatal(err)
	}

	sf2 := settingsFile{}
	sf2.Permissions.Allow = []string{
		"Bash(git diff:*)",
	}
	sf2.Permissions.Deny = []string{
		"Bash(git push:*)",
	}
	data2, err := json.Marshal(sf2)
	if err != nil {
		t.Fatal(err)
	}
	f2 := filepath.Join(dir, "project.json")
	if err := os.WriteFile(f2, data2, 0o644); err != nil {
		t.Fatal(err)
	}

	f3 := filepath.Join(dir, "missing.json")

	rules, err := loadPermissionsFromPaths([]settingsSource{
		{path: f1, scope: scopeUser},
		{path: f2, scope: scopeProject},
		{path: f3, scope: scopeLocal},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(rules.allow) != 2 {
		t.Errorf("allow len = %d, want 2", len(rules.allow))
	}
	if len(rules.ask) != 1 {
		t.Errorf("ask len = %d, want 1", len(rules.ask))
	}
	if len(rules.deny) != 1 {
		t.Errorf("deny len = %d, want 1", len(rules.deny))
	}
}

func TestLoadPermissionsFromPathsAllMissing(t *testing.T) {
	rules, err := loadPermissionsFromPaths([]settingsSource{
		{path: "/a", scope: scopeManaged},
		{path: "/b", scope: scopeLocal},
		{path: "/c", scope: scopeProject},
		{path: "/d", scope: scopeUser},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rules.allow) != 0 ||
		len(rules.ask) != 0 ||
		len(rules.deny) != 0 {
		t.Errorf("expected empty rules, got %+v", rules)
	}
}

func TestLoadPermissionsFromPathsInvalidJSONFailsClosed(t *testing.T) {
	dir := t.TempDir()

	valid := settingsFile{}
	valid.Permissions.Allow = []string{"Bash(git status:*)"}
	validData, err := json.Marshal(valid)
	if err != nil {
		t.Fatal(err)
	}
	validPath := filepath.Join(dir, "valid.json")
	if err := os.WriteFile(validPath, validData, 0o644); err != nil {
		t.Fatal(err)
	}

	invalidPath := filepath.Join(dir, "invalid.json")
	if err := os.WriteFile(
		invalidPath, []byte("{bad json"), 0o644,
	); err != nil {
		t.Fatal(err)
	}

	_, err = loadPermissionsFromPaths([]settingsSource{
		{path: validPath, scope: scopeProject},
		{path: invalidPath, scope: scopeUser},
	})
	if err == nil {
		t.Fatal("expected error for invalid JSON settings file")
	}
}

func TestLoadPermissionsFromPathsExistingUnreadablePath(t *testing.T) {
	dir := t.TempDir()

	valid := settingsFile{}
	valid.Permissions.Allow = []string{"Bash(git status:*)"}
	validData, err := json.Marshal(valid)
	if err != nil {
		t.Fatal(err)
	}
	validPath := filepath.Join(dir, "valid.json")
	if err := os.WriteFile(validPath, validData, 0o644); err != nil {
		t.Fatal(err)
	}

	// Use a directory path to force a non-ENOENT read error.
	unreadablePath := filepath.Join(dir, "not-a-file")
	if err := os.Mkdir(unreadablePath, 0o755); err != nil {
		t.Fatal(err)
	}

	_, err = loadPermissionsFromPaths([]settingsSource{
		{path: validPath, scope: scopeProject},
		{path: unreadablePath, scope: scopeLocal},
	})
	if err == nil {
		t.Fatal("expected error for existing unreadable settings path")
	}
}

func TestLoadPermissionsFromPathsManagedSettingsIncluded(t *testing.T) {
	dir := t.TempDir()

	managed := settingsFile{}
	managed.Permissions.Allow = []string{"Bash(git status:*)"}
	managedPath := filepath.Join(dir, "managed.json")
	managedData, err := json.Marshal(managed)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		managedPath, managedData, 0o644,
	); err != nil {
		t.Fatal(err)
	}

	project := settingsFile{}
	project.Permissions.Allow = []string{"Bash(npm test)"}
	projectPath := filepath.Join(dir, "project.json")
	projectData, err := json.Marshal(project)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		projectPath, projectData, 0o644,
	); err != nil {
		t.Fatal(err)
	}

	rules, err := loadPermissionsFromPaths([]settingsSource{
		{path: managedPath, scope: scopeManaged},
		{path: projectPath, scope: scopeProject},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rules.allow) != 2 {
		t.Fatalf("allow len = %d, want 2", len(rules.allow))
	}
}

func TestLoadPermissionsFromPathsMalformedManagedSettingsFailsClosed(
	t *testing.T,
) {
	dir := t.TempDir()
	managedPath := filepath.Join(dir, "managed.json")
	if err := os.WriteFile(
		managedPath, []byte("{bad json"), 0o644,
	); err != nil {
		t.Fatal(err)
	}

	project := settingsFile{}
	project.Permissions.Allow = []string{"Bash(git status:*)"}
	projectPath := filepath.Join(dir, "project.json")
	projectData, err := json.Marshal(project)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		projectPath, projectData, 0o644,
	); err != nil {
		t.Fatal(err)
	}

	_, err = loadPermissionsFromPaths([]settingsSource{
		{path: managedPath, scope: scopeManaged},
		{path: projectPath, scope: scopeProject},
	})
	if err == nil {
		t.Fatal("expected error for malformed managed settings file")
	}
}

func TestLoadPermissionsFromPathsRejectsMalformedBashPatterns(
	t *testing.T,
) {
	dir := t.TempDir()

	invalid := settingsFile{}
	invalid.Permissions.Allow = []string{
		"Bash(git status",
	}
	data, err := json.Marshal(invalid)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "invalid-pattern.json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}

	_, err = loadPermissionsFromPaths([]settingsSource{
		{path: path, scope: scopeProject},
	})
	if err == nil {
		t.Fatal("expected error for malformed Bash pattern")
	}
}

func TestLoadPermissionsFromPathsRejectsMalformedAskPatterns(
	t *testing.T,
) {
	dir := t.TempDir()

	invalid := settingsFile{}
	invalid.Permissions.Ask = []string{
		"Bash(git commit",
	}
	data, err := json.Marshal(invalid)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "invalid-ask-pattern.json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}

	_, err = loadPermissionsFromPaths([]settingsSource{
		{path: path, scope: scopeProject},
	})
	if err == nil {
		t.Fatal("expected error for malformed Bash ask pattern")
	}
}

func TestLoadPermissionsFromPathsRejectsEmptyBashPattern(
	t *testing.T,
) {
	dir := t.TempDir()

	invalid := settingsFile{}
	invalid.Permissions.Allow = []string{"Bash()"}
	data, err := json.Marshal(invalid)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "empty-pattern.json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}

	_, err = loadPermissionsFromPaths([]settingsSource{
		{path: path, scope: scopeProject},
	})
	if err == nil {
		t.Fatal("expected error for empty Bash pattern")
	}
}

func TestLoadPermissionsFromPathsManagedOnlyIgnoresLowerScopes(
	t *testing.T,
) {
	dir := t.TempDir()

	managed := settingsFile{}
	managed.Permissions.Allow = []string{"Bash(git status:*)"}
	managed.AllowManagedPermissionRulesOnly = true
	managedPath := filepath.Join(dir, "managed.json")
	managedData, err := json.Marshal(managed)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		managedPath, managedData, 0o644,
	); err != nil {
		t.Fatal(err)
	}

	project := settingsFile{}
	project.Permissions.Allow = []string{"Bash(git status"}
	projectPath := filepath.Join(dir, "project.json")
	projectData, err := json.Marshal(project)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		projectPath, projectData, 0o644,
	); err != nil {
		t.Fatal(err)
	}

	rules, err := loadPermissionsFromPaths([]settingsSource{
		{path: managedPath, scope: scopeManaged},
		{path: projectPath, scope: scopeProject},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !rules.managedOnly {
		t.Fatal("managedOnly = false, want true")
	}
	if len(rules.allow) != 1 {
		t.Fatalf("allow len = %d, want 1", len(rules.allow))
	}
}

func TestLoadPermissionsFromPathsManagedOnlyFalseStillReadsLowerScopes(
	t *testing.T,
) {
	dir := t.TempDir()

	managed := settingsFile{}
	managed.Permissions.Allow = []string{"Bash(git status:*)"}
	managedPath := filepath.Join(dir, "managed.json")
	managedData, err := json.Marshal(managed)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		managedPath, managedData, 0o644,
	); err != nil {
		t.Fatal(err)
	}

	project := settingsFile{}
	project.Permissions.Allow = []string{"Bash(git status"}
	projectPath := filepath.Join(dir, "project.json")
	projectData, err := json.Marshal(project)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(
		projectPath, projectData, 0o644,
	); err != nil {
		t.Fatal(err)
	}

	_, err = loadPermissionsFromPaths([]settingsSource{
		{path: managedPath, scope: scopeManaged},
		{path: projectPath, scope: scopeProject},
	})
	if err == nil {
		t.Fatal("expected error when lower scopes stay active")
	}
}

func TestLoadPermissionsFromPathsValidPatternsStillPass(t *testing.T) {
	dir := t.TempDir()

	sf := settingsFile{}
	sf.Permissions.Allow = []string{
		"Bash(git status:*)",
		"Bash(npm run lint *)",
		"Bash(ls*)",
		"Bash(npm run compile)",
		"Skill(commit-commands:commit:*)",
	}
	sf.Permissions.Ask = []string{
		"Bash(git commit:*)",
	}
	sf.Permissions.Deny = []string{
		"Bash(git push:*)",
	}
	data, err := json.Marshal(sf)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "valid-patterns.json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}

	rules, err := loadPermissionsFromPaths([]settingsSource{
		{path: path, scope: scopeProject},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rules.allow) != len(sf.Permissions.Allow) {
		t.Fatalf(
			"allow len = %d, want %d",
			len(rules.allow), len(sf.Permissions.Allow),
		)
	}
	if len(rules.ask) != len(sf.Permissions.Ask) {
		t.Fatalf(
			"ask len = %d, want %d",
			len(rules.ask), len(sf.Permissions.Ask),
		)
	}
	if len(rules.deny) != len(sf.Permissions.Deny) {
		t.Fatalf(
			"deny len = %d, want %d",
			len(rules.deny), len(sf.Permissions.Deny),
		)
	}
}
