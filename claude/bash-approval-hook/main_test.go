package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// writeSettingsFile creates a settings file at the given path
// with the given allow/deny patterns.
func writeSettingsFile(
	t *testing.T, path string,
	allow, deny []string,
) {
	t.Helper()
	writeSettingsFileWithRules(
		t, path, allow, nil, deny, false,
	)
}

func writeSettingsFileWithRules(
	t *testing.T,
	path string,
	allow, ask, deny []string,
	managedOnly bool,
) {
	t.Helper()
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}

	sf := settingsFile{}
	sf.Permissions.Allow = allow
	sf.Permissions.Ask = ask
	sf.Permissions.Deny = deny
	sf.AllowManagedPermissionRulesOnly = managedOnly

	data, err := json.Marshal(sf)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatal(err)
	}
}

// writeSettings creates a .claude/settings.json under dir with
// the given allow/deny patterns.
func writeSettings(
	t *testing.T, dir string,
	allow, deny []string,
) {
	t.Helper()
	writeSettingsFile(
		t,
		filepath.Join(dir, ".claude", "settings.json"),
		allow, deny,
	)
}

// writeLocalSettings creates a .claude/settings.local.json under
// dir with the given allow/deny patterns.
func writeLocalSettings(
	t *testing.T, dir string,
	allow, deny []string,
) {
	t.Helper()
	writeSettingsFile(
		t,
		filepath.Join(
			dir, ".claude", "settings.local.json",
		),
		allow, deny,
	)
}

func writeRawSettingsFile(t *testing.T, path, content string) {
	t.Helper()
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
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
		homeAllow  []string
		homeDeny   []string
		localAllow []string
		localDeny  []string
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

		// ---- Git path flag variants ----
		{
			name: "-Cpath adjacent form approved",
			input: func(cwd string) string {
				cmd := "git -C" + cwd + " status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "--git-dir separate form approved",
			input: func(cwd string) string {
				cmd := "git --git-dir " + cwd +
					"/.git status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "--work-tree= equals form approved",
			input: func(cwd string) string {
				cmd := "git --work-tree=" + cwd +
					" status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "--work-tree separate form approved",
			input: func(cwd string) string {
				cmd := "git --work-tree " + cwd +
					" status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "multiple -C flags approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" -C " + cwd + " status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "mixed -C and --work-tree approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" --work-tree=" + cwd +
					" status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "-C missing value at end no output",
			input: func(cwd string) string {
				return hookJSON("git -C", cwd)
			},
			wantOutput: "",
		},
		{
			name: "--git-dir missing value no output",
			input: func(cwd string) string {
				return hookJSON("git --git-dir", cwd)
			},
			wantOutput: "",
		},
		{
			name: "--work-tree missing value no output",
			input: func(cwd string) string {
				return hookJSON(
					"git --work-tree", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "unknown global long option no output",
			input: func(cwd string) string {
				return hookJSON(
					"git --unknown-global status", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "unknown global short option no output",
			input: func(cwd string) string {
				return hookJSON("git -Z status", cwd)
			},
			wantOutput: "",
		},
		{
			name: "unsupported split form no output",
			input: func(cwd string) string {
				return hookJSON(
					"git --namespace foo status", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "equals-only global option approved",
			input: func(cwd string) string {
				return hookJSON(
					"git --namespace=foo status", cwd,
				)
			},
			allow: []string{
				"Bash(git '--namespace=foo' status)",
			},
			wantOutput: "approve",
		},
		{
			name: "-C relative dot approved",
			input: func(cwd string) string {
				return hookJSON(
					"git -C . status", cwd,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "-C trailing slash approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + "/ status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},

		// ---- Git global options preserved ----
		{
			name: "--no-pager preserved after strip",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" --no-pager log"
				return hookJSON(cmd, cwd)
			},
			allow: []string{
				"Bash(git --no-pager log:*)",
			},
			wantOutput: "approve",
		},
		{
			name: "-c key val preserved after strip",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" -c core.pager=less log"
				return hookJSON(cmd, cwd)
			},
			allow: []string{
				"Bash(git -c 'core.pager=less' log:*)",
			},
			wantOutput: "approve",
		},
		{
			name: "path + non-path flags combined",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" --no-pager status"
				return hookJSON(cmd, cwd)
			},
			allow: []string{
				"Bash(git --no-pager status:*)",
			},
			wantOutput: "approve",
		},
		{
			name: "global -- preserved after strip",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " -- status"
				return hookJSON(cmd, cwd)
			},
			allow: []string{
				"Bash(git -- status)",
			},
			wantOutput: "approve",
		},

		// ---- Git subcommand edge cases ----
		{
			name: "git alone no subcommand approved",
			input: func(cwd string) string {
				return hookJSON("git", cwd)
			},
			allow:      []string{"Bash(git)"},
			wantOutput: "approve",
		},
		{
			name: "git --version approved",
			input: func(cwd string) string {
				return hookJSON("git --version", cwd)
			},
			allow:      []string{"Bash(git --version)"},
			wantOutput: "approve",
		},
		{
			name: "git -C cwd no subcommand approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd
				return hookJSON(cmd, cwd)
			},
			allow:      []string{"Bash(git)"},
			wantOutput: "approve",
		},

		// ---- Shell constructs ----
		{
			name: "pipe-all operator approved",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" log |& head -5"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "double-quoted commit message",
			input: func(cwd string) string {
				cmd := `git commit -m "hello world"`
				return hookJSON(cmd, cwd)
			},
			allow: []string{
				"Bash(git commit *)",
			},
			wantOutput: "approve",
		},
		{
			name: "for loop rejected",
			input: func(cwd string) string {
				cmd := "for i in 1 2; do " +
					"echo $i; done"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},
		{
			name: "function definition rejected",
			input: func(cwd string) string {
				return hookJSON(
					"foo() { echo bar; }", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "here-string rejected",
			input: func(cwd string) string {
				return hookJSON(
					"cat <<< hello", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "process substitution rejected",
			input: func(cwd string) string {
				return hookJSON(
					"cat <(echo hello)", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "backtick substitution rejected",
			input: func(cwd string) string {
				return hookJSON(
					"echo `pwd`", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "nested subshells approved",
			input: func(cwd string) string {
				cmd := "( (git -C " + cwd +
					" status) )"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "approve",
		},
		{
			name: "empty subshell rejected",
			input: func(cwd string) string {
				return hookJSON("()", cwd)
			},
			wantOutput: "",
		},
		{
			name: "heredoc rejected",
			input: func(cwd string) string {
				cmd := "cat <<EOF\nhello\nEOF"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},

		// ---- Pattern matching ----
		{
			name: "non-Bash pattern prefix no match",
			input: func(cwd string) string {
				return hookJSON("git status", cwd)
			},
			allow:      []string{"Read(git status:*)"},
			wantOutput: "",
		},
		{
			name: "missing closing paren no match",
			input: func(cwd string) string {
				return hookJSON("git status", cwd)
			},
			allow:      []string{"Bash(git status"},
			wantOutput: "",
		},
		{
			name: "legacy colon-star exact prefix",
			input: func(cwd string) string {
				return hookJSON("git status", cwd)
			},
			allow:      []string{"Bash(git status:*)"},
			wantOutput: "approve",
		},
		{
			name: "space-star exact prefix match",
			input: func(cwd string) string {
				return hookJSON("npm run lint", cwd)
			},
			allow:      []string{"Bash(npm run lint *)"},
			wantOutput: "approve",
		},
		{
			name: "deny with legacy colon-star",
			input: func(cwd string) string {
				return hookJSON(
					"git add file.txt", cwd,
				)
			},
			allow:      []string{"Bash(git add:*)"},
			deny:       []string{"Bash(git add:*)"},
			wantOutput: "",
		},
		{
			name: "multiple stars in glob",
			input: func(cwd string) string {
				return hookJSON(
					"xfooybarz", cwd,
				)
			},
			allow:      []string{"Bash(*foo*bar*)"},
			wantOutput: "approve",
		},

		// ---- Settings loading ----
		{
			name: "settings.local.json patterns used",
			input: func(cwd string) string {
				return hookJSON("npm test", cwd)
			},
			allow:      []string{},
			localAllow: []string{"Bash(npm test)"},
			wantOutput: "approve",
		},
		{
			name: "home and project allow merge",
			input: func(cwd string) string {
				return hookJSON(
					"git status && npm test", cwd,
				)
			},
			allow:      []string{"Bash(npm test)"},
			homeAllow:  []string{"Bash(git status:*)"},
			wantOutput: "approve",
		},
		{
			name: "home deny blocks project allow",
			input: func(cwd string) string {
				return hookJSON("npm test", cwd)
			},
			allow:      []string{"Bash(npm test)"},
			homeDeny:   []string{"Bash(npm test)"},
			wantOutput: "",
		},

		// ---- Chain edge cases ----
		{
			name: "wrong -C path in chain rejects all",
			input: func(cwd string) string {
				cmd := "git -C " + cwd +
					" status && git -C /wrong diff"
				return hookJSON(cmd, cwd)
			},
			wantOutput: "",
		},
		{
			name: "semicolon with disallowed no output",
			input: func(cwd string) string {
				return hookJSON(
					"git status; rm -rf /", cwd,
				)
			},
			wantOutput: "",
		},
		{
			name: "stateful symlink chain no output",
			input: func(cwd string) string {
				return hookJSON(
					"ln -s /tmp escape && "+
						"git -C escape/.. status",
					cwd,
				)
			},
			allow: []string{
				"Bash(ln:*)",
				"Bash(git status:*)",
			},
			wantOutput: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			managedPath := filepath.Join(
				t.TempDir(), "managed-settings.json",
			)
			prevManagedResolver := managedSettingsPathResolver
			managedSettingsPathResolver = func(
				_ string,
			) (string, bool) {
				return managedPath, true
			}
			t.Cleanup(func() {
				managedSettingsPathResolver = prevManagedResolver
			})

			// Set up project dir with settings.
			cwd := t.TempDir()
			if err := os.Mkdir(
				filepath.Join(cwd, ".git"), 0o755,
			); err != nil {
				t.Fatal(err)
			}
			allow := tt.allow
			if allow == nil {
				allow = defaultAllow
			}
			writeSettings(t, cwd, allow, tt.deny)

			// Isolate HOME so ~/.claude/settings.json
			// doesn't leak in.
			home := t.TempDir()
			t.Setenv("HOME", home)

			if tt.homeAllow != nil ||
				tt.homeDeny != nil {
				writeSettings(
					t, home,
					tt.homeAllow, tt.homeDeny,
				)
			}
			if tt.localAllow != nil ||
				tt.localDeny != nil {
				writeLocalSettings(
					t, cwd,
					tt.localAllow, tt.localDeny,
				)
			}

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

func TestMainELogsCommandExtractionReason(t *testing.T) {
	tests := []struct {
		name        string
		command     string
		wantLogPart string
	}{
		{
			name:        "parse error",
			command:     "echo 'unterminated",
			wantLogPart: "command extraction parse error:",
		},
		{
			name:        "unsupported construct",
			command:     "git -C $(pwd) status",
			wantLogPart: "command extraction unsupported shell construct",
		},
	}

	origEnabled := debugLogEnabled
	origLogName := debugLogFileName
	origExecResolver := executablePathResolver
	t.Cleanup(func() {
		debugLogEnabled = origEnabled
		debugLogFileName = origLogName
		executablePathResolver = origExecResolver
	})

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			debugDir := t.TempDir()
			debugPath := filepath.Join(
				debugDir, "hook-debug.log",
			)
			execPath := filepath.Join(
				debugDir, "bash-approval-hook",
			)

			debugLogEnabled = "true"
			debugLogFileName = filepath.Base(debugPath)
			executablePathResolver = func() (string, error) {
				return execPath, nil
			}

			cwd := t.TempDir()
			input := hookJSON(tt.command, cwd)
			r := strings.NewReader(input)
			var out bytes.Buffer

			err := mainE(r, &out)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if strings.TrimSpace(out.String()) != "" {
				t.Fatalf(
					"expected no output, got %q",
					out.String(),
				)
			}

			logData, err := os.ReadFile(debugPath)
			if err != nil {
				t.Fatalf(
					"failed to read debug log: %v",
					err,
				)
			}
			logText := string(logData)
			if !strings.Contains(logText, tt.wantLogPart) {
				t.Fatalf(
					"log missing %q\nlog:\n%s",
					tt.wantLogPart,
					logText,
				)
			}
		})
	}
}

func TestMainEManagedAndAskRules(t *testing.T) {
	tests := []struct {
		name       string
		setup      func(t *testing.T, cwd, home, managedPath string)
		wantOutput string // "approve" or "" (no output)
	}{
		{
			name: "ask rule match returns no output",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettingsFileWithRules(
					t,
					filepath.Join(cwd, ".claude", "settings.json"),
					[]string{"Bash(git status:*)"},
					nil,
					nil,
					false,
				)
				writeSettingsFileWithRules(
					t,
					filepath.Join(
						cwd,
						".claude",
						"settings.local.json",
					),
					nil,
					[]string{"Bash(git status:*)"},
					nil,
					false,
				)
			},
			wantOutput: "",
		},
		{
			name: "managed allow permits command",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettingsFileWithRules(
					t,
					managedPath,
					[]string{"Bash(git status:*)"},
					nil,
					nil,
					false,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "managed deny blocks lower-scope allow",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettingsFileWithRules(
					t,
					managedPath,
					nil,
					nil,
					[]string{"Bash(git status:*)"},
					false,
				)
				writeSettingsFileWithRules(
					t,
					filepath.Join(cwd, ".claude", "settings.json"),
					[]string{"Bash(git status:*)"},
					nil,
					nil,
					false,
				)
			},
			wantOutput: "",
		},
		{
			name: "managed-only ignores lower allow deny and ask",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettingsFileWithRules(
					t,
					managedPath,
					[]string{"Bash(git status:*)"},
					nil,
					nil,
					true,
				)
				writeSettingsFileWithRules(
					t,
					filepath.Join(cwd, ".claude", "settings.json"),
					nil,
					nil,
					[]string{"Bash(git status:*)"},
					false,
				)
				writeSettingsFileWithRules(
					t,
					filepath.Join(
						cwd,
						".claude",
						"settings.local.json",
					),
					nil,
					[]string{"Bash(git status:*)"},
					nil,
					false,
				)
				writeSettingsFileWithRules(
					t,
					filepath.Join(
						home,
						".claude",
						"settings.json",
					),
					nil,
					nil,
					[]string{"Bash(git status:*)"},
					false,
				)
			},
			wantOutput: "approve",
		},
		{
			name: "managed-only without managed allow returns no output",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettingsFileWithRules(
					t,
					managedPath,
					nil,
					nil,
					nil,
					true,
				)
				writeSettingsFileWithRules(
					t,
					filepath.Join(cwd, ".claude", "settings.json"),
					[]string{"Bash(git status:*)"},
					nil,
					nil,
					false,
				)
			},
			wantOutput: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cwd := t.TempDir()
			if err := os.Mkdir(
				filepath.Join(cwd, ".git"), 0o755,
			); err != nil {
				t.Fatal(err)
			}

			home := t.TempDir()
			t.Setenv("HOME", home)

			managedPath := filepath.Join(
				t.TempDir(), "managed-settings.json",
			)
			prevManagedResolver := managedSettingsPathResolver
			managedSettingsPathResolver = func(
				_ string,
			) (string, bool) {
				return managedPath, true
			}
			t.Cleanup(func() {
				managedSettingsPathResolver = prevManagedResolver
			})

			tt.setup(t, cwd, home, managedPath)

			var buf bytes.Buffer
			err := mainE(
				strings.NewReader(hookJSON("git status", cwd)),
				&buf,
			)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			output := strings.TrimSpace(buf.String())
			if tt.wantOutput == "approve" {
				if output == "" {
					t.Fatal("expected approval output, got empty")
				}
				var out hookOutput
				if err := json.Unmarshal(
					[]byte(output), &out,
				); err != nil {
					t.Fatalf("invalid JSON output: %v", err)
				}
				if out.Decision != "allow" {
					t.Fatalf(
						"decision = %q, want %q",
						out.Decision, "allow",
					)
				}
				return
			}

			if output != "" {
				t.Fatalf("expected no output, got %q", output)
			}
		})
	}
}

func TestMainEFailClosedOnSettingsErrors(t *testing.T) {
	tests := []struct {
		name  string
		setup func(
			t *testing.T, cwd, home, managedPath string,
		)
	}{
		{
			name: "invalid managed settings JSON no output",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettings(
					t,
					cwd,
					[]string{"Bash(git status:*)"},
					nil,
				)
				writeRawSettingsFile(
					t,
					managedPath,
					"{bad json",
				)
			},
		},
		{
			name: "invalid home settings JSON no output",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettings(
					t,
					cwd,
					[]string{"Bash(git status:*)"},
					nil,
				)
				writeRawSettingsFile(
					t,
					filepath.Join(home, ".claude", "settings.json"),
					"{bad json",
				)
			},
		},
		{
			name: "invalid project settings JSON no output",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettings(
					t,
					home,
					[]string{"Bash(git status:*)"},
					nil,
				)
				writeRawSettingsFile(
					t,
					filepath.Join(cwd, ".claude", "settings.json"),
					"{bad json",
				)
			},
		},
		{
			name: "existing unreadable settings path no output",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettings(
					t,
					cwd,
					[]string{"Bash(git status:*)"},
					nil,
				)
				// Directory at file path forces read error.
				if err := os.MkdirAll(
					filepath.Join(
						cwd,
						".claude",
						"settings.local.json",
					),
					0o755,
				); err != nil {
					t.Fatal(err)
				}
			},
		},
		{
			name: "malformed Bash pattern no output",
			setup: func(
				t *testing.T, cwd, home, managedPath string,
			) {
				writeSettings(
					t,
					home,
					[]string{"Bash(git status:*)"},
					nil,
				)
				writeRawSettingsFile(
					t,
					filepath.Join(cwd, ".claude", "settings.json"),
					`{"permissions":{"allow":["Bash()"],"deny":[]}}`,
				)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cwd := t.TempDir()
			if err := os.Mkdir(
				filepath.Join(cwd, ".git"), 0o755,
			); err != nil {
				t.Fatal(err)
			}

			home := t.TempDir()
			t.Setenv("HOME", home)

			managedPath := filepath.Join(
				t.TempDir(), "managed-settings.json",
			)
			prevManagedResolver := managedSettingsPathResolver
			managedSettingsPathResolver = func(
				_ string,
			) (string, bool) {
				return managedPath, true
			}
			t.Cleanup(func() {
				managedSettingsPathResolver = prevManagedResolver
			})

			tt.setup(t, cwd, home, managedPath)

			var out bytes.Buffer
			err := mainE(
				strings.NewReader(hookJSON("git status", cwd)),
				&out,
			)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := strings.TrimSpace(out.String()); got != "" {
				t.Fatalf("expected no output, got %q", got)
			}
		})
	}
}
