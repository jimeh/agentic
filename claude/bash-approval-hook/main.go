// bash-approval-hook auto-approves shell commands that match the
// Bash allow/deny patterns in Claude Code settings files. Git
// commands with recognized global path flags (-C, --git-dir,
// --work-tree) pointing at the current project directory are
// normalized by stripping only those path flags before pattern
// matching. Unknown or malformed git global options fail closed.
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
	debug := newHookDebugLogger()
	defer debug.close()
	debug.logf("mainE start")

	var input hookInput
	if err := json.NewDecoder(r).Decode(&input); err != nil {
		debug.logf("decode input failed: %v", err)
		return fmt.Errorf("decode input: %w", err)
	}
	debug.logf(
		"decoded input tool=%q cwd=%q command=%q",
		input.ToolName,
		input.CWD,
		input.ToolInput.Command,
	)

	if input.ToolName != "Bash" || input.ToolInput.Command == "" {
		debug.logf("no opinion: unsupported tool or empty command")
		return nil
	}

	cwd := input.CWD
	if cwd == "" {
		debug.logf("no opinion: empty cwd")
		return nil
	}
	nctx, ok := newNormalizeContext(cwd)
	if !ok {
		debug.logf("no opinion: normalize context creation failed")
		return nil
	}

	// Parse into individual commands via shell AST.
	extract := extractCommandsWithReason(
		input.ToolInput.Command,
	)
	if extract.reason != extractFailureNone {
		switch extract.reason {
		case extractFailureParseError:
			debug.logf(
				"no opinion: command extraction parse error: %v",
				extract.parseErr,
			)
		case extractFailureUnsupported:
			debug.logf(
				"no opinion: command extraction " +
					"unsupported shell construct",
			)
		default:
			debug.logf(
				"no opinion: command extraction failed",
			)
		}
		return nil
	}
	cmds := extract.commands
	debug.logf("extracted %d command(s)", len(cmds))

	// Normalize every sub-command. Git path flags are stripped
	// only when they resolve to cwd; non-git commands pass
	// through as-is. Unknown or malformed pre-subcommand git
	// global options fail closed.
	normalized := make([]string, 0, len(cmds))
	for idx, args := range cmds {
		cmd, ok := normalizeCommand(args, nctx)
		if !ok {
			debug.logf(
				"no opinion: normalization failed at index=%d",
				idx,
			)
			return nil
		}
		debug.logf("normalized[%d]=%q", idx, cmd)
		normalized = append(normalized, cmd)
	}

	// Load permission patterns from settings files.
	// Fail closed on any uncertainty (read/parse/validation errors or an
	// empty allow set) by returning no opinion.
	rules, err := loadPermissions(nctx.cwd)
	if err != nil || len(rules.allow) == 0 {
		if err != nil {
			debug.logf(
				"no opinion: load permissions failed: %v",
				err,
			)
		} else {
			debug.logf("no opinion: allow rules are empty")
		}
		return nil
	}
	debug.logf(
		"loaded permissions allow=%d ask=%d deny=%d managed_only=%v",
		len(rules.allow),
		len(rules.ask),
		len(rules.deny),
		rules.managedOnly,
	)

	// All normalized commands must satisfy deny -> ask -> allow:
	// - deny match: no opinion
	// - ask match: no opinion
	// - allow match required
	for _, cmd := range normalized {
		if matchesAnyPattern(cmd, rules.deny) {
			debug.logf("no opinion: deny rule matched command=%q", cmd)
			return nil
		}
		if matchesAnyPattern(cmd, rules.ask) {
			debug.logf("no opinion: ask rule matched command=%q", cmd)
			return nil
		}
		if !matchesAnyPattern(cmd, rules.allow) {
			debug.logf(
				"no opinion: command not allowed command=%q",
				cmd,
			)
			return nil
		}
	}

	// Every sub-command passed — auto-approve.
	if err := json.NewEncoder(w).Encode(hookOutput{
		Decision: "allow",
	}); err != nil {
		debug.logf("encode output failed: %v", err)
		return err
	}
	debug.logf("approved command set")
	return nil
}
