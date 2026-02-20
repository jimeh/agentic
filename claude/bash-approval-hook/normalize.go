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

type normalizeContext struct {
	cwd         string
	canonCWD    string
	canonGitDir string
	hasCanonGit bool
}

func newNormalizeContext(cwd string) (normalizeContext, bool) {
	canonCWD, ok := canonicalize(cwd)
	if !ok {
		return normalizeContext{}, false
	}

	ctx := normalizeContext{
		cwd:      cwd,
		canonCWD: canonCWD,
	}
	if canonGitDir, ok := canonicalize(
		filepath.Join(cwd, ".git"),
	); ok {
		ctx.canonGitDir = canonGitDir
		ctx.hasCanonGit = true
	}

	return ctx, true
}

type gitPathPolicy int

const (
	gitPathPolicyNone gitPathPolicy = iota
	gitPathPolicyCWD
	gitPathPolicyGitDir
)

type gitGlobalOptionSpec struct {
	pathPolicy    gitPathPolicy
	allowSeparate bool
	allowEquals   bool
	allowAttached bool
}

type parsedGitGlobalOption struct {
	consumed   int
	keepTokens []string
	pathPolicy gitPathPolicy
	pathValue  string
}

type gitPrefixParseResult struct {
	keepPrefix []string
	pathChecks []parsedGitGlobalOption
	subcommand int
	sawPath    bool
}

var gitNoValueGlobalOptions = map[string]struct{}{
	"--help":               {},
	"--version":            {},
	"-p":                   {},
	"--paginate":           {},
	"-P":                   {},
	"--no-pager":           {},
	"--bare":               {},
	"--no-replace-objects": {},
	"--literal-pathspecs":  {},
	"--glob-pathspecs":     {},
	"--noglob-pathspecs":   {},
	"--icase-pathspecs":    {},
	"--no-lazy-fetch":      {},
	"--no-optional-locks":  {},
}

var gitValueGlobalOptions = map[string]gitGlobalOptionSpec{
	"-C": {
		pathPolicy:    gitPathPolicyCWD,
		allowSeparate: true,
		allowAttached: true,
	},
	"-c": {
		pathPolicy:    gitPathPolicyNone,
		allowSeparate: true,
		allowAttached: true,
	},
	"--git-dir": {
		pathPolicy:    gitPathPolicyGitDir,
		allowSeparate: true,
		allowEquals:   true,
	},
	"--work-tree": {
		pathPolicy:    gitPathPolicyCWD,
		allowSeparate: true,
		allowEquals:   true,
	},
	"--namespace": {
		pathPolicy:  gitPathPolicyNone,
		allowEquals: true,
	},
	"--config-env": {
		pathPolicy:  gitPathPolicyNone,
		allowEquals: true,
	},
	"--super-prefix": {
		pathPolicy:  gitPathPolicyNone,
		allowEquals: true,
	},
	"--exec-path": {
		pathPolicy:  gitPathPolicyNone,
		allowEquals: true,
	},
	"--list-cmds": {
		pathPolicy:  gitPathPolicyNone,
		allowEquals: true,
	},
	"--attr-source": {
		pathPolicy:  gitPathPolicyNone,
		allowEquals: true,
	},
}

func parseGitPrefix(args []string) (gitPrefixParseResult, bool) {
	result := gitPrefixParseResult{
		subcommand: len(args),
	}
	for i := 1; i < len(args); {
		arg := args[i]
		if arg == "--" {
			result.keepPrefix = append(result.keepPrefix, arg)
			if i+1 < len(args) {
				result.subcommand = i + 1
			}
			return result, true
		}

		if arg == "-" || !strings.HasPrefix(arg, "-") {
			result.subcommand = i
			return result, true
		}

		parsed, ok := parseGitGlobalOption(args, i)
		if !ok {
			return gitPrefixParseResult{}, false
		}
		if parsed.pathPolicy == gitPathPolicyNone {
			result.keepPrefix = append(
				result.keepPrefix, parsed.keepTokens...,
			)
		} else {
			result.sawPath = true
			result.pathChecks = append(
				result.pathChecks, parsed,
			)
		}
		i += parsed.consumed
	}

	return result, true
}

func parseGitGlobalOption(
	args []string, idx int,
) (parsedGitGlobalOption, bool) {
	arg := args[idx]
	if _, ok := gitNoValueGlobalOptions[arg]; ok {
		return parsedGitGlobalOption{
			consumed:   1,
			keepTokens: []string{arg},
			pathPolicy: gitPathPolicyNone,
		}, true
	}

	if spec, ok := gitValueGlobalOptions[arg]; ok {
		if !spec.allowSeparate || idx+1 >= len(args) {
			return parsedGitGlobalOption{}, false
		}
		value := args[idx+1]
		if value == "" {
			return parsedGitGlobalOption{}, false
		}
		return parsedGitGlobalOption{
			consumed:   2,
			keepTokens: []string{arg, value},
			pathPolicy: spec.pathPolicy,
			pathValue:  value,
		}, true
	}

	if strings.HasPrefix(arg, "--") {
		name, value, ok := strings.Cut(arg, "=")
		if !ok || value == "" {
			return parsedGitGlobalOption{}, false
		}
		spec, ok := gitValueGlobalOptions[name]
		if !ok || !spec.allowEquals {
			return parsedGitGlobalOption{}, false
		}
		return parsedGitGlobalOption{
			consumed:   1,
			keepTokens: []string{arg},
			pathPolicy: spec.pathPolicy,
			pathValue:  value,
		}, true
	}

	if strings.HasPrefix(arg, "-") && len(arg) > 2 {
		name := arg[:2]
		value := arg[2:]
		spec, ok := gitValueGlobalOptions[name]
		if !ok || !spec.allowAttached || value == "" {
			return parsedGitGlobalOption{}, false
		}
		return parsedGitGlobalOption{
			consumed:   1,
			keepTokens: []string{arg},
			pathPolicy: spec.pathPolicy,
			pathValue:  value,
		}, true
	}

	return parsedGitGlobalOption{}, false
}

func validatePathChecks(
	checks []parsedGitGlobalOption, ctx normalizeContext,
) bool {
	for _, check := range checks {
		switch check.pathPolicy {
		case gitPathPolicyCWD:
			if !pathMatchesCanonical(
				check.pathValue, ctx, ctx.canonCWD,
			) {
				return false
			}
		case gitPathPolicyGitDir:
			if !ctx.hasCanonGit ||
				!pathMatchesCanonical(
					check.pathValue, ctx, ctx.canonGitDir,
				) {
				return false
			}
		default:
			return false
		}
	}
	return true
}

func rewriteGitCommand(
	args []string, parsed gitPrefixParseResult,
) []string {
	if !parsed.sawPath {
		return args
	}
	result := make([]string, 0, len(args))
	result = append(result, "git")
	result = append(result, parsed.keepPrefix...)
	result = append(result, args[parsed.subcommand:]...)
	return result
}

// normalizeGitCommand strips recognized git global path flags
// (-C, --git-dir, --work-tree) only when their values resolve to
// cwd/cwd/.git. Unknown or malformed pre-subcommand global options
// are rejected to fail closed.
func normalizeGitCommand(
	args []string, ctx normalizeContext,
) ([]string, bool) {
	parsed, ok := parseGitPrefix(args)
	if !ok {
		return nil, false
	}
	if !validatePathChecks(parsed.pathChecks, ctx) {
		return nil, false
	}
	return rewriteGitCommand(args, parsed), true
}

// normalizeCommand returns a normalized string representation of a
// command for permission checking. Non-git commands are returned
// as-is. Git commands are parsed strictly in their pre-subcommand
// global-option prefix and fail closed on unknown or malformed
// options.
func normalizeCommand(
	args []string, ctx normalizeContext,
) (string, bool) {
	if len(args) == 0 {
		return "", false
	}

	if args[0] != "git" {
		return shellJoin(args), true
	}

	norm, ok := normalizeGitCommand(args, ctx)
	if !ok {
		return "", false
	}
	return shellJoin(norm), true
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

// pathMatchesCanonical returns true when path resolves to expected.
func pathMatchesCanonical(
	path string, ctx normalizeContext, expected string,
) bool {
	canonPath, ok := canonicalize(resolvePath(path, ctx.cwd))
	if !ok {
		return false
	}
	return canonPath == expected
}

// pathMatchesCWD returns true when path resolves to cwd.
func pathMatchesCWD(path, cwd string) bool {
	ctx, ok := newNormalizeContext(cwd)
	if !ok {
		return false
	}
	return pathMatchesCanonical(path, ctx, ctx.canonCWD)
}

// gitDirMatchesCWD returns true when path resolves to cwd/.git.
func gitDirMatchesCWD(path, cwd string) bool {
	ctx, ok := newNormalizeContext(cwd)
	if !ok || !ctx.hasCanonGit {
		return false
	}
	return pathMatchesCanonical(path, ctx, ctx.canonGitDir)
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
