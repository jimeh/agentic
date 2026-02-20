package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeSettings creates a .claude/settings.json under dir with
// the given allow/deny patterns.
func writeSettings(
	t *testing.T, dir string,
	allow, deny []string,
) {
	t.Helper()
	claudeDir := filepath.Join(dir, ".claude")
	if err := os.MkdirAll(claudeDir, 0o755); err != nil {
		t.Fatal(err)
	}

	sf := settingsFile{}
	sf.Permissions.Allow = allow
	sf.Permissions.Deny = deny

	data, err := json.Marshal(sf)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(claudeDir, "settings.json")
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
}

// hookJSON builds a JSON hook input from command and cwd.
func hookJSON(command, cwd string) string {
	input := hookInput{
		ToolName:      "Bash",
		ToolInput:     toolInput{Command: command},
		CWD:           cwd,
		HookEventName: "PreToolUse",
	}
	data, _ := json.Marshal(input)
	return string(data)
}

// hookJSONWithTool builds a JSON hook input with a custom
// tool_name.
func hookJSONWithTool(
	toolName, command, cwd string,
) string {
	input := hookInput{
		ToolName:      toolName,
		ToolInput:     toolInput{Command: command},
		CWD:           cwd,
		HookEventName: "PreToolUse",
	}
	data, _ := json.Marshal(input)
	return string(data)
}

func TestMainE(t *testing.T) {
	// Each test gets a fresh temp dir as the "project" with
	// its own .claude/settings.json. HOME is set to an empty
	// temp dir so ~/.claude/settings.json doesn't interfere.
	defaultAllow := []string{
		"Bash(git status:*)",
		"Bash(git diff:*)",
		"Bash(git log:*)",
		"Bash(git add:*)",
		"Bash(cat:*)",
		"Bash(ls:*)",
		"Bash(echo:*)",
		"Bash(head:*)",
		"Bash(grep:*)",
		"Bash(wc:*)",
	}

	tests := []struct {
		name       string
		input      func(cwd string) string
		allow      []string
		deny       []string
		wantOutput string // "approve" or "" (no output)
		wantErr    bool
	}{
		// ---- Single git with -C ----
		{
			name: "git -C CWD status approved",
			input: func(cwd string) string {
				return hookJSON(
					"git -C "+cwd+" status", cwd,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "git -C CWD diff --cached approved",
			input: func(cwd string) string {
				return hookJSON(
					"git -C "+cwd+" diff --cached",
					cwd,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "git -C CWD log --oneline -n 5 approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" log --oneline -n 5"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "git -C CWD push not in allow",
			input: func(cwd string) string {
				return hookJSON(
					"git -C "+cwd+" push", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "git -C /other status wrong path",
			input: func(cwd string) string {
				return hookJSON(
					"git -C /other status", cwd,
				)
			},
			wantOutput: "",
		},

		// ---- Single git without -C ----
		{
			name: "git status no -C approved",
			input: func(cwd string) string {
				return hookJSON("git status", cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "git diff --cached no -C approved",
			input: func(cwd string) string {
				return hookJSON(
					"git diff --cached", cwd,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "git push no -C not in allow",
			input: func(cwd string) string {
				return hookJSON("git push", cwd)
			},
			wantOutput: "",
		},

		// ---- Single non-git ----
		{
			name: "cat file.txt approved",
			input: func(cwd string) string {
				return hookJSON("cat file.txt", cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "ls -la approved",
			input: func(cwd string) string {
				return hookJSON("ls -la", cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "echo hello approved",
			input: func(cwd string) string {
				return hookJSON("echo hello", cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "rm -rf not in allow",
			input: func(cwd string) string {
				return hookJSON("rm -rf /", cwd)
			},
			wantOutput: "",
		},

		// ---- && chains ----
		{
			name: "chain git -C status and diff approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " status" +
					" && git -C " + cwd + " diff"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "chain git -C status and cat approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" status && cat file.txt"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "chain git status and cat no -C approved",
			input: func(cwd string) string {
				return hookJSON(
					"git status && cat file.txt",
					cwd,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "chain cat and ls approved",
			input: func(cwd string) string {
				return hookJSON(
					"cat file.txt && ls -la", cwd,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "chain git -C status and push no output",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " status" +
					" && git -C " + cwd + " push"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},
		{
			name: "chain git -C status and rm no output",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" status && rm -rf /"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},
		{
			name: "three commands all allowed approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" status && cat file.txt" +
					" && ls -la"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "three commands one disallowed no output",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" status && cat file.txt" +
					" && rm -rf /"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},

		// ---- ; semicolon chains ----
		{
			name: "semicolon git -C status and cat approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" status; cat file.txt"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},

		// ---- || chains ----
		{
			name: "or chain git -C status and diff approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " status" +
					" || git -C " + cwd + " diff"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},

		// ---- Mixed operators ----
		{
			name: "mixed and semicolon approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" status && cat file.txt; ls -la"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},

		// ---- Subshells ----
		{
			name: "subshell git -C status approved",
			input: func(cwd string) string {
				cmd := "(git -C " + cwd + " status)"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "subshell chain approved",
			input: func(cwd string) string {
				cmd := "(git -C " + cwd +
					" status && git -C " +
					cwd + " diff)"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "subshell then cat approved",
			input: func(cwd string) string {
				cmd := "(git -C " + cwd +
					" status) && cat file.txt"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "two subshells approved",
			input: func(cwd string) string {
				cmd := "(git -C " + cwd +
					" status) && (cat file.txt)"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "subshell git push no output",
			input: func(cwd string) string {
				cmd := "(git -C " + cwd + " push)"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},

		// ---- Block groups ----
		{
			name: "block git -C status approved",
			input: func(cwd string) string {
				cmd := "{ git -C " + cwd + " status; }"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "block chain approved",
			input: func(cwd string) string {
				cmd := "{ git -C " + cwd +
					" status && cat file.txt; }"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},

		// ---- Pipes ----
		{
			name: "pipe git log and head approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" log | head -5"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "three-way pipe approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" log | head -5 | grep pattern"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "pipe cat and grep approved",
			input: func(cwd string) string {
				return hookJSON(
					"cat file.txt | grep pattern",
					cwd,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "pipe git log and rm no output",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" log | rm -rf /"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},

		// ---- --git-dir / --work-tree ----
		{
			name: "git-dir and work-tree approved",
			input: func(cwd string) string {
				cmd := "git --git-dir=" + cwd +
					"/.git --work-tree=" +
					cwd + " status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "git-dir wrong path no output",
			input: func(cwd string) string {
				cmd := "git --git-dir=/other/.git status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},

		// ---- Deny patterns ----
		{
			name: "deny blocks normalized git command",
			input: func(cwd string) string {
				return hookJSON(
					"git -C "+cwd+" status", cwd,
				)
			},
			deny:       []string{"Bash(git status:*)"},
			wantOutput: "",
		},
		{
			name: "deny blocks non-git command",
			input: func(cwd string) string {
				return hookJSON("cat file.txt", cwd)
			},
			deny:       []string{"Bash(cat:*)"},
			wantOutput: "",
		},

		// ---- Still-rejected constructs (safety) ----
		{
			name: "redirect rejected",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" diff > file"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},
		{
			name: "background rejected",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " status &"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},
		{
			name: "variable expansion rejected",
			input: func(cwd string) string {
				return hookJSON(
					"git -C $dir status", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "command substitution rejected",
			input: func(cwd string) string {
				return hookJSON(
					"git -C $(pwd) status", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "negation rejected",
			input: func(cwd string) string {
				cmd := "! git -C " + cwd + " status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},
		{
			name: "env assignment rejected",
			input: func(cwd string) string {
				return hookJSON(
					"GIT_PAGER=cat git diff", cwd,
				)
			},
			wantOutput: "",
		},

		// ---- Glob patterns ----
		{
			name: "glob space-star allow",
			input: func(cwd string) string {
				return hookJSON(
					"npm run lint --fix", cwd,
				)
			},
			allow:      []string{"Bash(npm run lint *)"},
			wantOutput: "approve",
		},
		{
			name: "glob bare-star allow",
			input: func(cwd string) string {
				return hookJSON("lsof -i :8080", cwd)
			},
			allow:      []string{"Bash(ls*)"},
			wantOutput: "approve",
		},
		{
			name: "glob star-prefix allow",
			input: func(cwd string) string {
				return hookJSON(
					"node --version", cwd,
				)
			},
			allow:      []string{"Bash(* --version)"},
			wantOutput: "approve",
		},
		{
			name: "glob star-middle allow",
			input: func(cwd string) string {
				return hookJSON(
					"git push origin main", cwd,
				)
			},
			allow: []string{
				"Bash(git push * main)",
			},
			wantOutput: "approve",
		},
		{
			name: "glob match-all allow",
			input: func(cwd string) string {
				return hookJSON("anything at all", cwd)
			},
			allow:      []string{"Bash(*)"},
			wantOutput: "approve",
		},
		{
			name: "glob deny blocks command",
			input: func(cwd string) string {
				return hookJSON("git push origin", cwd)
			},
			allow:      []string{"Bash(git *)"},
			deny:       []string{"Bash(git push *)"},
			wantOutput: "",
		},
		{
			name: "glob with -C normalization",
			input: func(cwd string) string {
				return hookJSON(
					"git -C "+cwd+" log --oneline",
					cwd,
				)
			},
			allow:      []string{"Bash(git log *)"},
			wantOutput: "approve",
		},

		// ---- Quoting (shellJoin) ----
		{
			name: "git -C with spaces in path approved",
			input: func(cwd string) string {
				cmd := `git -C '` + cwd +
					`' commit -m 'fix: add spaces'`
				return hookJSON(cmd, cwd)
			},
			allow: []string{
				"Bash(git commit -m 'fix: add spaces')",
			},
			wantOutput: "approve",
		},

		// ---- Local git flags on subcommand ----
		{
			name: "git rev-parse --git-dir approved",
			input: func(cwd string) string {
				return hookJSON(
					"git rev-parse --git-dir", cwd,
				)
			},
			allow:      []string{"Bash(git rev-parse:*)"},
			wantOutput: "approve",
		},
		{
			name: "git -C CWD log -C -1 approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " log -C -1"
				return hookJSON(cmd, cwd)
			},
			allow:      []string{"Bash(git log:*)"},
			wantOutput: "approve",
		},

		// ---- End-of-options (--) ----
		{
			name: "git -C CWD diff -- -C approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" diff -- -C"
				return hookJSON(cmd, cwd)
			},
			allow:      []string{"Bash(git diff *)"},
			wantOutput: "approve",
		},

		// ---- Edge cases ----
		{
			name:    "invalid JSON returns error",
			input:   func(_ string) string { return "{bad" },
			wantErr: true,
		},
		{
			name: "non-Bash tool_name no output",
			input: func(cwd string) string {
				return hookJSONWithTool(
					"Read", "git status", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "empty command no output",
			input: func(cwd string) string {
				return hookJSON("", cwd)
			},
			wantOutput: "",
		},
		{
			name: "empty cwd no output",
			input: func(_ string) string {
				return hookJSON("git status", "")
			},
			wantOutput: "",
		},
		{
			name: "no allow patterns no output",
			input: func(cwd string) string {
				return hookJSON("git status", cwd)
			},
			allow:      []string{},
			wantOutput: "",
		},
		{
			name: "whitespace-only command no output",
			input: func(cwd string) string {
				return hookJSON("   ", cwd)
			},
			wantOutput: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set up project dir with settings.
			cwd := t.TempDir()
			allow := tt.allow
			if allow == nil {
				allow = defaultAllow
			}
			writeSettings(t, cwd, allow, tt.deny)

			// Isolate HOME so ~/.claude/settings.json
			// doesn't leak in.
			t.Setenv("HOME", t.TempDir())

			input := tt.input(cwd)
			r := strings.NewReader(input)
			var buf bytes.Buffer

			err := mainE(r, &buf)

			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			output := strings.TrimSpace(buf.String())

			if tt.wantOutput == "approve" {
				if output == "" {
					t.Fatal(
						"expected approval output," +
							" got empty",
					)
				}
				var out hookOutput
				if err := json.Unmarshal(
					[]byte(output), &out,
				); err != nil {
					t.Fatalf(
						"invalid JSON output: %v",
						err,
					)
				}
				if out.Decision != "allow" {
					t.Errorf(
						"decision = %q, want %q",
						out.Decision, "allow",
					)
				}
			} else if output != "" {
				t.Errorf(
					"expected no output, got %q",
					output,
				)
			}
		})
	}
}
