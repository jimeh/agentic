// bash-approval-hook auto-approves shell commands that match the
// Bash allow/deny patterns in Claude Code settings files. Git
// commands with -C, --git-dir, or --work-tree flags pointing at
// the current project directory are normalized by stripping those
// flags before pattern matching. Non-git commands and git
// commands without path flags are checked as-is.
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

// hookInput is the JSON structure Claude Code sends on stdin.
type hookInput struct {
	ToolName      string    `json:"tool_name"`
	ToolInput     toolInput `json:"tool_input"`
	CWD           string    `json:"cwd"`
	HookEventName string    `json:"hook_event_name"`
}

type toolInput struct {
	Command string `json:"command"`
}

// hookOutput is returned on stdout to auto-approve a command.
type hookOutput struct {
	Decision string `json:"permissionDecision"`
}

func main() {
	// Exit 0 always — errors mean "no opinion".
	_ = mainE(os.Stdin, os.Stdout)
}

// mainE contains the full hook pipeline: decode input, normalize
// commands, check permissions, and write the approval decision.
// Returns nil with no output written when the hook has no opinion.
func mainE(r io.Reader, w io.Writer) error {
	var input hookInput
	if err := json.NewDecoder(r).Decode(&input); err != nil {
		return fmt.Errorf("decode input: %w", err)
	}

	if input.ToolName != "Bash" || input.ToolInput.Command == "" {
		return nil
	}

	cwd := input.CWD
	if cwd == "" {
		return nil
	}

	// Parse into individual commands via shell AST.
	cmds := extractCommands(input.ToolInput.Command)
	if len(cmds) == 0 {
		return nil
	}

	// Normalize every sub-command. Git commands with path
	// flags are stripped; non-git commands pass through as-is.
	// Any git command with path flags pointing outside cwd
	// causes the entire input to be rejected.
	normalized := make([]string, 0, len(cmds))
	for _, args := range cmds {
		cmd, ok := normalizeCommand(args, cwd)
		if !ok {
			return nil
		}
		normalized = append(normalized, cmd)
	}

	// Load permission patterns from settings files.
	// Fail closed on any uncertainty (read/parse/validation errors or an
	// empty allow set) by returning no opinion.
	rules, err := loadPermissions(cwd)
	if err != nil || len(rules.allow) == 0 {
		return nil
	}

	// All normalized commands must satisfy deny -> ask -> allow:
	// - deny match: no opinion
	// - ask match: no opinion
	// - allow match required
	for _, cmd := range normalized {
		if matchesAnyPattern(cmd, rules.deny) {
			return nil
		}
		if matchesAnyPattern(cmd, rules.ask) {
			return nil
		}
		if !matchesAnyPattern(cmd, rules.allow) {
			return nil
		}
	}

	// Every sub-command passed — auto-approve.
	return json.NewEncoder(w).Encode(hookOutput{
		Decision: "allow",
	})
}
