// bash-approval-hook rewrites Bash git commands by stripping
// global path flags (-C, --git-dir, --work-tree) when they
// resolve to the current project directory. Rewrites are
// emitted through hookSpecificOutput.updatedInput.command.
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

type hookSpecificOutput struct {
	HookEventName            string    `json:"hookEventName"`
	PermissionDecisionReason string    `json:"permissionDecisionReason"`
	UpdatedInput             toolInput `json:"updatedInput"`
}

// hookOutput is returned on stdout when command input is rewritten.
type hookOutput struct {
	HookSpecificOutput hookSpecificOutput `json:"hookSpecificOutput"`
}

const rewriteOutputReason = "Stripped git global path flags that match cwd"

func main() {
	// Exit 0 always — errors mean "no opinion".
	_ = mainE(os.Stdin, os.Stdout)
}

// mainE decodes hook input, attempts command rewrite, and writes
// updatedInput when rewrite succeeds and changes the command.
// Returns nil with no output when the hook has no opinion.
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

	rewrite := rewriteCommandString(input.ToolInput.Command, nctx)
	if rewrite.reason != rewriteFailureNone {
		switch rewrite.reason {
		case rewriteFailureParseError:
			debug.logf(
				"no opinion: rewrite parse error: %v",
				rewrite.parseErr,
			)
		case rewriteFailureUnsupported:
			debug.logf(
				"no opinion: rewrite unsupported shell construct",
			)
		case rewriteFailureNormalization:
			debug.logf(
				"no opinion: rewrite normalization failed",
			)
		case rewriteFailurePrintError:
			debug.logf(
				"no opinion: rewrite print failed: %v",
				rewrite.printErr,
			)
		default:
			debug.logf("no opinion: rewrite failed")
		}
		return nil
	}

	if !rewrite.changed {
		debug.logf("no opinion: command unchanged after rewrite pass")
		return nil
	}

	if err := json.NewEncoder(w).Encode(hookOutput{
		HookSpecificOutput: hookSpecificOutput{
			HookEventName:            "PreToolUse",
			PermissionDecisionReason: rewriteOutputReason,
			UpdatedInput: toolInput{
				Command: rewrite.command,
			},
		},
	}); err != nil {
		debug.logf("encode output failed: %v", err)
		return err
	}
	debug.logf("rewrote command to=%q", rewrite.command)
	return nil
}
