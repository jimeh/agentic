package main

import (
	"path/filepath"
	"strings"

	"mvdan.cc/sh/v3/syntax"
)

// extractCommands parses a shell command string and returns each
// simple command's arguments as a string slice. Returns nil if
// the input is unparseable or contains unsupported constructs
// (redirections, variable expansions, etc.).
func extractCommands(input string) [][]string {
	f, err := syntax.NewParser(
		syntax.KeepComments(false),
		syntax.Variant(syntax.LangBash),
	).Parse(strings.NewReader(input), "")
	if err != nil {
		return nil
	}

	var cmds [][]string
	for _, stmt := range f.Stmts {
		sc := collectSimpleCommands(stmt)
		if sc == nil {
			return nil
		}
		cmds = append(cmds, sc...)
	}
	if len(cmds) == 0 {
		return nil
	}
	return cmds
}

// collectSimpleCommands recursively extracts simple commands
// from a statement, handling &&, ||, pipes, subshells, and
// block groups. Returns nil if any unsupported construct is
// encountered.
func collectSimpleCommands(stmt *syntax.Stmt) [][]string {
	if stmt == nil || stmt.Cmd == nil {
		return nil
	}
	if stmt.Negated || stmt.Background || stmt.Coprocess {
		return nil
	}
	if len(stmt.Redirs) > 0 {
		return nil
	}

	switch cmd := stmt.Cmd.(type) {
	case *syntax.CallExpr:
		if len(cmd.Assigns) > 0 {
			return nil
		}
		args := wordsToStrings(cmd.Args)
		if args == nil {
			return nil
		}
		return [][]string{args}

	case *syntax.BinaryCmd:
		switch cmd.Op {
		case syntax.AndStmt, syntax.OrStmt,
			syntax.Pipe, syntax.PipeAll:
			// supported operators
		default:
			return nil
		}
		left := collectSimpleCommands(cmd.X)
		if left == nil {
			return nil
		}
		right := collectSimpleCommands(cmd.Y)
		if right == nil {
			return nil
		}
		return append(left, right...)

	case *syntax.Subshell:
		return collectFromStmts(cmd.Stmts)

	case *syntax.Block:
		return collectFromStmts(cmd.Stmts)

	default:
		return nil // loop, function, etc.
	}
}

// collectFromStmts extracts simple commands from a slice of
// statements (used by subshell and block group handlers).
func collectFromStmts(stmts []*syntax.Stmt) [][]string {
	var cmds [][]string
	for _, s := range stmts {
		sc := collectSimpleCommands(s)
		if sc == nil {
			return nil
		}
		cmds = append(cmds, sc...)
	}
	if len(cmds) == 0 {
		return nil
	}
	return cmds
}

// wordsToStrings converts syntax words into plain strings.
// Returns nil if any word contains non-literal content.
func wordsToStrings(words []*syntax.Word) []string {
	if len(words) == 0 {
		return nil
	}
	out := make([]string, 0, len(words))
	for _, w := range words {
		s, ok := wordToString(w)
		if !ok {
			return nil
		}
		out = append(out, s)
	}
	return out
}

// wordToString extracts the string value from a word that
// consists only of literal text (possibly quoted). Returns
// false for words containing expansions or other non-literal
// content.
func wordToString(w *syntax.Word) (string, bool) {
	var sb strings.Builder
	for _, part := range w.Parts {
		switch p := part.(type) {
		case *syntax.Lit:
			sb.WriteString(p.Value)
		case *syntax.SglQuoted:
			sb.WriteString(p.Value)
		case *syntax.DblQuoted:
			for _, dp := range p.Parts {
				lit, ok := dp.(*syntax.Lit)
				if !ok {
					return "", false
				}
				sb.WriteString(lit.Value)
			}
		default:
			return "", false
		}
	}
	return sb.String(), true
}

// normalizeGitCommand strips -C, --git-dir, and --work-tree
// flags from a git command's argument list when the paths
// resolve to cwd. Returns the normalized args and true if
// normalization was applied, or nil and false otherwise.
func normalizeGitCommand(
	args []string, cwd string,
) ([]string, bool) {
	if len(args) == 0 || args[0] != "git" {
		return nil, false
	}

	result := []string{"git"}
	hadPathFlag := false
	pathsOK := true

	for i := 1; i < len(args); i++ {
		arg := args[i]

		// -C <path>
		if arg == "-C" {
			hadPathFlag = true
			if i+1 >= len(args) {
				return nil, false
			}
			if !pathMatchesCWD(args[i+1], cwd) {
				pathsOK = false
			}
			i++
			continue
		}

		// --git-dir=<path> or --git-dir <path>
		if arg == "--git-dir" {
			hadPathFlag = true
			if i+1 >= len(args) {
				return nil, false
			}
			if !gitDirMatchesCWD(args[i+1], cwd) {
				pathsOK = false
			}
			i++
			continue
		}
		if strings.HasPrefix(arg, "--git-dir=") {
			hadPathFlag = true
			p := strings.TrimPrefix(arg, "--git-dir=")
			if !gitDirMatchesCWD(p, cwd) {
				pathsOK = false
			}
			continue
		}

		// --work-tree=<path> or --work-tree <path>
		if arg == "--work-tree" {
			hadPathFlag = true
			if i+1 >= len(args) {
				return nil, false
			}
			if !pathMatchesCWD(args[i+1], cwd) {
				pathsOK = false
			}
			i++
			continue
		}
		if strings.HasPrefix(arg, "--work-tree=") {
			hadPathFlag = true
			p := strings.TrimPrefix(arg, "--work-tree=")
			if !pathMatchesCWD(p, cwd) {
				pathsOK = false
			}
			continue
		}

		// Anything else passes through.
		result = append(result, arg)
	}

	if !hadPathFlag || !pathsOK {
		return nil, false
	}
	return result, true
}

// normalizeCommand returns a normalized string representation of
// a command for permission checking. Non-git commands are returned
// as-is. Git commands with path flags pointing at cwd are
// normalized by stripping those flags. Git commands with path
// flags pointing elsewhere are rejected (returns "", false).
// Git commands without path flags are returned as-is.
func normalizeCommand(
	args []string, cwd string,
) (string, bool) {
	if len(args) == 0 {
		return "", false
	}

	if args[0] != "git" {
		return joinTokens(args), true
	}

	// Git command without path flags — pass through as-is.
	if !containsGitPathFlag(args) {
		return joinTokens(args), true
	}

	// Git command with path flags — normalize.
	norm, ok := normalizeGitCommand(args, cwd)
	if !ok {
		return "", false
	}
	return joinTokens(norm), true
}

// containsGitPathFlag reports whether args contains any of the
// git path flags: -C, --git-dir, or --work-tree.
func containsGitPathFlag(args []string) bool {
	for _, a := range args {
		switch {
		case a == "-C",
			a == "--git-dir",
			a == "--work-tree",
			strings.HasPrefix(a, "--git-dir="),
			strings.HasPrefix(a, "--work-tree="):
			return true
		}
	}
	return false
}

// joinTokens reassembles tokens into a single command string.
func joinTokens(tokens []string) string {
	return strings.Join(tokens, " ")
}

// pathMatchesCWD returns true when path resolves to cwd.
func pathMatchesCWD(path, cwd string) bool {
	return filepath.Clean(resolvePath(path, cwd)) ==
		filepath.Clean(cwd)
}

// gitDirMatchesCWD returns true when path resolves to cwd/.git.
func gitDirMatchesCWD(path, cwd string) bool {
	return filepath.Clean(resolvePath(path, cwd)) ==
		filepath.Clean(filepath.Join(cwd, ".git"))
}

func resolvePath(path, cwd string) string {
	if filepath.IsAbs(path) {
		return path
	}
	return filepath.Join(cwd, path)
}
