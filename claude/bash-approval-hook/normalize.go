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

// normalizeGitCommand strips git global path flags (-C,
// --git-dir, --work-tree) from a git command's argument list
// when their paths resolve to cwd. Only flags in git's
// top-level global option segment (before the subcommand) are
// considered path flags. Returns the original args unchanged
// when no global path flags are present. Returns nil and false
// if any path flag pointed elsewhere or a value was missing.
func normalizeGitCommand(
	args []string, cwd string,
) ([]string, bool) {
	result := []string{"git"}
	sawPathFlag := false

	cmdIdx := gitSubcommandIndex(args)
	for i := 1; i < cmdIdx; i++ {
		arg := args[i]

		// Preserve "--" if used to terminate global options.
		if arg == "--" {
			result = append(result, arg)
			continue
		}

		// -C <path>
		if arg == "-C" {
			sawPathFlag = true
			if i+1 >= cmdIdx {
				return nil, false
			}
			if !pathMatchesCWD(args[i+1], cwd) {
				return nil, false
			}
			i++
			continue
		}
		// -C<path>
		if strings.HasPrefix(arg, "-C") &&
			len(arg) > 2 {
			sawPathFlag = true
			if !pathMatchesCWD(arg[2:], cwd) {
				return nil, false
			}
			continue
		}

		// --git-dir=<path> or --git-dir <path>
		if arg == "--git-dir" {
			sawPathFlag = true
			if i+1 >= cmdIdx {
				return nil, false
			}
			if !gitDirMatchesCWD(args[i+1], cwd) {
				return nil, false
			}
			i++
			continue
		}
		if strings.HasPrefix(arg, "--git-dir=") {
			sawPathFlag = true
			p := strings.TrimPrefix(arg, "--git-dir=")
			if !gitDirMatchesCWD(p, cwd) {
				return nil, false
			}
			continue
		}

		// --work-tree=<path> or --work-tree <path>
		if arg == "--work-tree" {
			sawPathFlag = true
			if i+1 >= cmdIdx {
				return nil, false
			}
			if !pathMatchesCWD(args[i+1], cwd) {
				return nil, false
			}
			i++
			continue
		}
		if strings.HasPrefix(arg, "--work-tree=") {
			sawPathFlag = true
			p := strings.TrimPrefix(arg, "--work-tree=")
			if !pathMatchesCWD(p, cwd) {
				return nil, false
			}
			continue
		}

		// Preserve non-path global options.
		result = append(result, arg)
		if gitGlobalOptionNeedsValue(arg) {
			if i+1 >= cmdIdx {
				return nil, false
			}
			result = append(result, args[i+1])
			i++
		}
	}

	if !sawPathFlag {
		return args, true
	}
	result = append(result, args[cmdIdx:]...)
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
		return shellJoin(args), true
	}

	// Normalize git command (strips path flags or passes
	// through unchanged if none are present).
	norm, ok := normalizeGitCommand(args, cwd)
	if !ok {
		return "", false
	}
	return shellJoin(norm), true
}

// gitSubcommandIndex returns the index where git's subcommand
// begins. The scan consumes git global options (including options
// that require a separate value) and stops at the first
// non-option token or token after a global "--".
func gitSubcommandIndex(args []string) int {
	if len(args) <= 1 {
		return len(args)
	}

	for i := 1; i < len(args); i++ {
		arg := args[i]

		if arg == "--" {
			if i+1 < len(args) {
				return i + 1
			}
			return len(args)
		}

		if arg == "-" || !strings.HasPrefix(arg, "-") {
			return i
		}

		if gitGlobalOptionNeedsValue(arg) {
			if i+1 >= len(args) {
				return len(args)
			}
			i++
		}
	}
	return len(args)
}

func gitGlobalOptionNeedsValue(arg string) bool {
	switch arg {
	case "-C",
		"-c",
		"--git-dir",
		"--work-tree",
		"--namespace",
		"--config-env",
		"--super-prefix",
		"--exec-path",
		"--attr-source":
		return true
	default:
		return false
	}
}

// shellJoin reassembles tokens into a shell command string,
// quoting tokens that contain special characters.
func shellJoin(tokens []string) string {
	parts := make([]string, 0, len(tokens))
	for _, t := range tokens {
		q, err := syntax.Quote(t, syntax.LangBash)
		if err != nil {
			// Shouldn't happen with literal strings,
			// but fall back to the raw token.
			parts = append(parts, t)
			continue
		}
		parts = append(parts, q)
	}
	return strings.Join(parts, " ")
}

// canonicalize returns the fully-resolved absolute path, resolving
// each path component in order. Returns false when resolution fails.
func canonicalize(path string) (string, bool) {
	if !filepath.IsAbs(path) {
		return "", false
	}
	sep := string(filepath.Separator)
	parts := strings.Split(path, sep)
	resolvedPath := sep

	for _, p := range parts {
		switch p {
		case "", ".":
			continue
		case "..":
			resolvedPath = filepath.Dir(resolvedPath)
		default:
			next := filepath.Join(resolvedPath, p)
			evalPath, err := filepath.EvalSymlinks(next)
			if err != nil {
				return "", false
			}
			resolvedPath = filepath.Clean(evalPath)
		}
	}

	return filepath.Clean(resolvedPath), true
}

// pathMatchesCWD returns true when path resolves to cwd.
func pathMatchesCWD(path, cwd string) bool {
	canonPath, ok := canonicalize(resolvePath(path, cwd))
	if !ok {
		return false
	}
	canonCWD, ok := canonicalize(cwd)
	if !ok {
		return false
	}
	return canonPath == canonCWD
}

// gitDirMatchesCWD returns true when path resolves to cwd/.git.
func gitDirMatchesCWD(path, cwd string) bool {
	canonPath, ok := canonicalize(resolvePath(path, cwd))
	if !ok {
		return false
	}
	canonGitDir, ok := canonicalize(filepath.Join(cwd, ".git"))
	if !ok {
		return false
	}
	return canonPath == canonGitDir
}

func resolvePath(path, cwd string) string {
	if filepath.IsAbs(path) {
		return path
	}
	sep := string(filepath.Separator)
	if strings.HasSuffix(cwd, sep) {
		return cwd + path
	}
	return cwd + sep + path
}
