package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

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

// hookJSONWithTool builds a JSON hook input with a custom tool name.
func hookJSONWithTool(toolName, command, cwd string) string {
	input := hookInput{
		ToolName:      toolName,
		ToolInput:     toolInput{Command: command},
		CWD:           cwd,
		HookEventName: "PreToolUse",
	}
	data, _ := json.Marshal(input)
	return string(data)
}

func setupCWD(t *testing.T) string {
	t.Helper()

	cwd := t.TempDir()
	if err := os.Mkdir(filepath.Join(cwd, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}

	resolved, err := filepath.EvalSymlinks(cwd)
	if err != nil {
		t.Fatal(err)
	}
	return resolved
}

type decodeResult struct {
	output hookOutput
	raw    map[string]any
}

func decodeHookOutput(
	t *testing.T, data string,
) decodeResult {
	t.Helper()

	var out hookOutput
	if err := json.Unmarshal([]byte(data), &out); err != nil {
		t.Fatalf("invalid output json: %v", err)
	}

	var raw map[string]any
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		t.Fatalf("invalid output json map: %v", err)
	}

	return decodeResult{output: out, raw: raw}
}

func TestMainE(t *testing.T) {
	tests := []struct {
		name        string
		input       func(cwd string) string
		wantUpdated string
		wantOutput  bool
		wantErr     bool
	}{
		{
			name: "rewrite -C matching cwd",
			input: func(cwd string) string {
				return hookJSON("git -C "+cwd+" status", cwd)
			},
			wantUpdated: "git status",
			wantOutput:  true,
		},
		{
			name: "rewrite --work-tree equals form",
			input: func(cwd string) string {
				cmd := "git --work-tree=" + cwd + " status"
				return hookJSON(cmd, cwd)
			},
			wantUpdated: "git status",
			wantOutput:  true,
		},
		{
			name: "rewrite --git-dir separate form",
			input: func(cwd string) string {
				cmd := "git --git-dir " + cwd + "/.git status"
				return hookJSON(cmd, cwd)
			},
			wantUpdated: "git status",
			wantOutput:  true,
		},
		{
			name: "rewrite chain all commands",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " status && git -C " + cwd + " diff"
				return hookJSON(cmd, cwd)
			},
			wantUpdated: "git status && git diff",
			wantOutput:  true,
		},
		{
			name: "rewrite subshell and pipe",
			input: func(cwd string) string {
				cmd := "(git -C " + cwd + " log) | head -5"
				return hookJSON(cmd, cwd)
			},
			wantUpdated: "(git log) | head -5",
			wantOutput:  true,
		},
		{
			name: "global -C rewritten local -C kept",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " log -C -1"
				return hookJSON(cmd, cwd)
			},
			wantUpdated: "git log -C -1",
			wantOutput:  true,
		},
		{
			name: "all-or-nothing wrong path in chain",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " status && git -C /wrong diff"
				return hookJSON(cmd, cwd)
			},
			wantOutput: false,
		},
		{
			name: "all-or-nothing unknown global option",
			input: func(cwd string) string {
				cmd := "git -C " + cwd + " status && git --unknown-global diff"
				return hookJSON(cmd, cwd)
			},
			wantOutput: false,
		},
		{
			name: "no output for non-git command",
			input: func(cwd string) string {
				return hookJSON("cat file.txt", cwd)
			},
			wantOutput: false,
		},
		{
			name: "no output when no rewrite needed",
			input: func(cwd string) string {
				return hookJSON("git status", cwd)
			},
			wantOutput: false,
		},
		{
			name: "unsupported syntax no output",
			input: func(cwd string) string {
				return hookJSON("git -C $(pwd) status", cwd)
			},
			wantOutput: false,
		},
		{
			name: "path safety symlink traversal rejected",
			input: func(cwd string) string {
				outside := t.TempDir()
				link := filepath.Join(cwd, "escape")
				if err := os.Symlink(outside, link); err != nil {
					t.Fatal(err)
				}
				cmd := "git -C " + link + "/.. status"
				return hookJSON(cmd, cwd)
			},
			wantOutput: false,
		},
		{
			name: "non-Bash tool no output",
			input: func(cwd string) string {
				return hookJSONWithTool("Read", "git status", cwd)
			},
			wantOutput: false,
		},
		{
			name: "empty command no output",
			input: func(cwd string) string {
				return hookJSON("", cwd)
			},
			wantOutput: false,
		},
		{
			name: "empty cwd no output",
			input: func(_ string) string {
				return hookJSON("git status", "")
			},
			wantOutput: false,
		},
		{
			name:    "invalid JSON returns error",
			input:   func(_ string) string { return "{bad" },
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cwd := setupCWD(t)
			input := tt.input(cwd)

			var out bytes.Buffer
			err := mainE(strings.NewReader(input), &out)

			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			got := strings.TrimSpace(out.String())
			if !tt.wantOutput {
				if got != "" {
					t.Fatalf("expected no output, got %q", got)
				}
				return
			}

			if got == "" {
				t.Fatal("expected rewrite output, got empty")
			}
			decoded := decodeHookOutput(t, got)
			if decoded.output.HookSpecificOutput.HookEventName != "PreToolUse" {
				t.Fatalf(
					"hookEventName = %q, want %q",
					decoded.output.HookSpecificOutput.HookEventName,
					"PreToolUse",
				)
			}
			if decoded.output.HookSpecificOutput.PermissionDecisionReason != rewriteOutputReason {
				t.Fatalf(
					"permissionDecisionReason = %q, want %q",
					decoded.output.HookSpecificOutput.PermissionDecisionReason,
					rewriteOutputReason,
				)
			}
			if decoded.output.HookSpecificOutput.UpdatedInput.Command != tt.wantUpdated {
				t.Fatalf(
					"updated command = %q, want %q",
					decoded.output.HookSpecificOutput.UpdatedInput.Command,
					tt.wantUpdated,
				)
			}
		})
	}
}

func TestMainEOutputHasReasonAndOmitsPermissionDecision(t *testing.T) {
	cwd := setupCWD(t)
	cmd := "git -C " + cwd + " status"
	input := hookJSON(cmd, cwd)

	var out bytes.Buffer
	err := mainE(strings.NewReader(input), &out)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got := strings.TrimSpace(out.String())
	if got == "" {
		t.Fatal("expected rewrite output, got empty")
	}

	decoded := decodeHookOutput(t, got)
	hookOutputMap, ok := decoded.raw["hookSpecificOutput"].(map[string]any)
	if !ok {
		t.Fatalf("hookSpecificOutput missing or invalid: %v", decoded.raw)
	}
	if _, hasPermissionDecision := hookOutputMap["permissionDecision"]; hasPermissionDecision {
		t.Fatalf("unexpected permissionDecision in output: %v", hookOutputMap)
	}
	if gotReason, ok := hookOutputMap["permissionDecisionReason"].(string); !ok ||
		gotReason == "" {
		t.Fatalf(
			"missing permissionDecisionReason in output: %v",
			hookOutputMap,
		)
	}
}

func TestMainELogsRewriteFailureReason(t *testing.T) {
	tests := []struct {
		name        string
		command     string
		wantLogPart string
	}{
		{
			name:        "parse error",
			command:     "echo 'unterminated",
			wantLogPart: "no opinion: rewrite parse error:",
		},
		{
			name:        "unsupported construct",
			command:     "git -C $(pwd) status",
			wantLogPart: "no opinion: rewrite unsupported shell construct",
		},
		{
			name:        "normalization failed",
			command:     "git -C /wrong status",
			wantLogPart: "no opinion: rewrite normalization failed",
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
			debugPath := filepath.Join(debugDir, "hook-debug.log")
			execPath := filepath.Join(debugDir, "bash-approval-hook")

			debugLogEnabled = "true"
			debugLogFileName = filepath.Base(debugPath)
			executablePathResolver = func() (string, error) {
				return execPath, nil
			}

			cwd := setupCWD(t)
			input := hookJSON(tt.command, cwd)
			var out bytes.Buffer

			err := mainE(strings.NewReader(input), &out)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if strings.TrimSpace(out.String()) != "" {
				t.Fatalf("expected no output, got %q", out.String())
			}

			logData, err := os.ReadFile(debugPath)
			if err != nil {
				t.Fatalf("failed to read debug log: %v", err)
			}
			logText := string(logData)
			if !strings.Contains(logText, tt.wantLogPart) {
				t.Fatalf("log missing %q\nlog:\n%s", tt.wantLogPart, logText)
			}
		})
	}
}
