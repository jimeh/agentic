package main

import (
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"mvdan.cc/sh/v3/syntax"
)

func TestExtractCommands(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  [][]string
	}{
		{
			name:  "simple command",
			input: "git status",
			want:  [][]string{{"git", "status"}},
		},
		{
			name:  "and chain",
			input: "git status && git diff",
			want: [][]string{
				{"git", "status"},
				{"git", "diff"},
			},
		},
		{
			name:  "or chain",
			input: "git status || git diff",
			want: [][]string{
				{"git", "status"},
				{"git", "diff"},
			},
		},
		{
			name:  "semicolon chain",
			input: "git status; git diff",
			want: [][]string{
				{"git", "status"},
				{"git", "diff"},
			},
		},
		{
			name:  "mixed and-then-semicolon",
			input: "git status && git diff; git log",
			want: [][]string{
				{"git", "status"},
				{"git", "diff"},
				{"git", "log"},
			},
		},
		{
			name:  "three and-chained",
			input: "git add . && git status && git diff",
			want: [][]string{
				{"git", "add", "."},
				{"git", "status"},
				{"git", "diff"},
			},
		},
		{
			name:  "command with flags",
			input: "git log --oneline -n 5",
			want: [][]string{
				{"git", "log", "--oneline", "-n", "5"},
			},
		},
		{
			name:  "double-quoted path",
			input: `git -C "/path with spaces" status`,
			want: [][]string{
				{
					"git", "-C",
					"/path with spaces", "status",
				},
			},
		},
		{
			name:  "single-quoted path",
			input: "git -C '/path with spaces' status",
			want: [][]string{
				{
					"git", "-C",
					"/path with spaces", "status",
				},
			},
		},
		{
			name:  "quoted chain operator is literal",
			input: `echo "a && b" && git status`,
			want: [][]string{
				{"echo", "a && b"},
				{"git", "status"},
			},
		},
		{
			name:  "pipe extracts both sides",
			input: "git log | head -5",
			want: [][]string{
				{"git", "log"},
				{"head", "-5"},
			},
		},
		{
			name:  "three-way pipe",
			input: "git log | head -5 | grep pattern",
			want: [][]string{
				{"git", "log"},
				{"head", "-5"},
				{"grep", "pattern"},
			},
		},
		{
			name:  "simple subshell",
			input: "(git status)",
			want:  [][]string{{"git", "status"}},
		},
		{
			name:  "subshell with chain",
			input: "(git status && git diff)",
			want: [][]string{
				{"git", "status"},
				{"git", "diff"},
			},
		},
		{
			name:  "subshell then command",
			input: "(git status) && cat file.txt",
			want: [][]string{
				{"git", "status"},
				{"cat", "file.txt"},
			},
		},
		{
			name:  "two subshells",
			input: "(git status) && (cat file.txt)",
			want: [][]string{
				{"git", "status"},
				{"cat", "file.txt"},
			},
		},
		{
			name:  "pipe within subshell",
			input: "(git log | head -5)",
			want: [][]string{
				{"git", "log"},
				{"head", "-5"},
			},
		},
		{
			name:  "block group",
			input: "{ git status; }",
			want:  [][]string{{"git", "status"}},
		},
		{
			name:  "block group with chain",
			input: "{ git status && cat file.txt; }",
			want: [][]string{
				{"git", "status"},
				{"cat", "file.txt"},
			},
		},
		{
			name:  "mixed chain with subshell",
			input: "git status && (git diff) && cat file.txt",
			want: [][]string{
				{"git", "status"},
				{"git", "diff"},
				{"cat", "file.txt"},
			},
		},
		{
			name:  "background returns nil",
			input: "git status &",
			want:  nil,
		},
		{
			name:  "redirect returns nil",
			input: "git diff > out.txt",
			want:  nil,
		},
		{
			name:  "redirect in subshell returns nil",
			input: "(git diff > out.txt)",
			want:  nil,
		},
		{
			name:  "variable expansion returns nil",
			input: "git -C $HOME status",
			want:  nil,
		},
		{
			name:  "command substitution returns nil",
			input: "git -C $(pwd) status",
			want:  nil,
		},
		{
			name:  "env assignment returns nil",
			input: "GIT_PAGER=cat git diff",
			want:  nil,
		},
		{
			name:  "negated returns nil",
			input: "! git status",
			want:  nil,
		},
		{
			name:  "empty input",
			input: "",
			want:  nil,
		},
		{
			name:  "only whitespace",
			input: "   ",
			want:  nil,
		},
		{
			name:  "equals-form flag",
			input: "git --git-dir=/path/.git status",
			want: [][]string{
				{
					"git",
					"--git-dir=/path/.git",
					"status",
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractCommands(tt.input)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf(
					"extractCommands(%q)\n  got  %v\n"+
						"  want %v",
					tt.input, got, tt.want,
				)
			}
		})
	}
}

func TestWordToString(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		want   string
		wantOK bool
	}{
		{"bare word", "hello", "hello", true},
		{"single quoted", "'hello world'", "hello world", true},
		{"double quoted", `"hello world"`, "hello world", true},
		{
			"mixed literal and quoted",
			`/path/"with spaces"/end`,
			"/path/with spaces/end", true,
		},
		{"variable expansion", "$HOME", "", false},
		{
			"expansion in double quotes",
			`"$HOME"`, "", false,
		},
		{
			"command substitution",
			"$(pwd)", "", false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Parse a minimal command to get a Word.
			f, err := syntax.NewParser(
				syntax.Variant(syntax.LangBash),
			).Parse(
				strings.NewReader("echo "+tt.input), "",
			)
			if err != nil {
				t.Fatalf("parse: %v", err)
			}
			stmt := f.Stmts[0]
			call := stmt.Cmd.(*syntax.CallExpr)
			// call.Args[0] is "echo", [1] is our word.
			w := call.Args[1]

			got, ok := wordToString(w)
			if ok != tt.wantOK || got != tt.want {
				t.Errorf(
					"wordToString(%q) = (%q, %v), "+
						"want (%q, %v)",
					tt.input, got, ok,
					tt.want, tt.wantOK,
				)
			}
		})
	}
}

func TestNormalizeGitCommand(t *testing.T) {
	cwd := t.TempDir()
	var err error
	cwd, err = filepath.EvalSymlinks(cwd)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(cwd, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}
	ctx, ok := newNormalizeContext(cwd)
	if !ok {
		t.Fatal("newNormalizeContext should succeed")
	}

	other := t.TempDir()
	other, err = filepath.EvalSymlinks(other)
	if err != nil {
		t.Fatal(err)
	}
	otherGitDir := filepath.Join(other, ".git")
	if err := os.Mkdir(otherGitDir, 0o755); err != nil {
		t.Fatal(err)
	}

	rewriteArg := func(arg string) string {
		arg = strings.ReplaceAll(
			arg,
			"/home/user/project/.git",
			filepath.Join(cwd, ".git"),
		)
		arg = strings.ReplaceAll(
			arg,
			"/home/user/project/",
			cwd+string(filepath.Separator),
		)
		arg = strings.ReplaceAll(arg, "/home/user/project", cwd)
		arg = strings.ReplaceAll(arg, "/other/project", other)
		arg = strings.ReplaceAll(arg, "/other/.git", otherGitDir)
		arg = strings.ReplaceAll(arg, "/other", other)
		return arg
	}

	tests := []struct {
		name     string
		args     []string
		wantNorm []string
		wantOK   bool
	}{
		// ---- No global path flags (pass-through) ----
		{
			name:     "no path flags passes through",
			args:     []string{"git", "status"},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "local -C is not a global path flag",
			args: []string{"git", "log", "-C", "-1"},
			wantNorm: []string{
				"git", "log", "-C", "-1",
			},
			wantOK: true,
		},
		{
			name: "local --git-dir is not a global path flag",
			args: []string{
				"git", "rev-parse", "--git-dir",
			},
			wantNorm: []string{
				"git", "rev-parse", "--git-dir",
			},
			wantOK: true,
		},
		{
			name: "unknown pre-subcommand long option rejects",
			args: []string{
				"git", "--unknown-global", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "unknown pre-subcommand short option rejects",
			args: []string{
				"git", "-Z", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "unknown short cluster rejects",
			args: []string{
				"git", "-Pq", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "known no-value option with equals rejects",
			args: []string{
				"git", "--version=2", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "known value option unsupported split form rejects",
			args: []string{
				"git", "--namespace", "foo", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "known value option equals form passes through",
			args: []string{
				"git", "--namespace=foo", "status",
			},
			wantNorm: []string{
				"git", "--namespace=foo", "status",
			},
			wantOK: true,
		},
		{
			name: "known equals-only option split form rejects",
			args: []string{
				"git", "--list-cmds", "main", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "known equals-only option equals form passes through",
			args: []string{
				"git", "--list-cmds=main", "status",
			},
			wantNorm: []string{
				"git", "--list-cmds=main", "status",
			},
			wantOK: true,
		},

		// ---- Global path flags ----
		{
			name: "strip -C matching cwd",
			args: []string{
				"git", "-C", "/home/user/project", "status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "-C with trailing slash",
			args: []string{
				"git", "-C", "/home/user/project/",
				"status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "-C non-matching path",
			args: []string{
				"git", "-C", "/other/project", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "-C with subcommand args",
			args: []string{
				"git", "-C", "/home/user/project",
				"log", "--oneline", "-n", "5",
			},
			wantNorm: []string{
				"git", "log", "--oneline", "-n", "5",
			},
			wantOK: true,
		},
		{
			name: "--git-dir= form",
			args: []string{
				"git",
				"--git-dir=/home/user/project/.git",
				"status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "--git-dir space form",
			args: []string{
				"git", "--git-dir",
				"/home/user/project/.git",
				"status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "--git-dir wrong path",
			args: []string{
				"git",
				"--git-dir=/other/.git",
				"status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "--work-tree= form",
			args: []string{
				"git",
				"--work-tree=/home/user/project",
				"status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "--work-tree space form",
			args: []string{
				"git", "--work-tree",
				"/home/user/project",
				"status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "--work-tree wrong path",
			args: []string{
				"git",
				"--work-tree=/other/project",
				"status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "combined --git-dir and --work-tree",
			args: []string{
				"git",
				"--git-dir=/home/user/project/.git",
				"--work-tree=/home/user/project",
				"status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "combined reversed order",
			args: []string{
				"git",
				"--work-tree=/home/user/project",
				"--git-dir=/home/user/project/.git",
				"log", "--oneline",
			},
			wantNorm: []string{
				"git", "log", "--oneline",
			},
			wantOK: true,
		},
		{
			name:     "-C without value",
			args:     []string{"git", "-C"},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name:     "--git-dir without value",
			args:     []string{"git", "--git-dir"},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name:     "--work-tree without value",
			args:     []string{"git", "--work-tree"},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "-C with other global flags preserved",
			args: []string{
				"git", "--no-pager", "-C",
				"/home/user/project", "log",
			},
			wantNorm: []string{
				"git", "--no-pager", "log",
			},
			wantOK: true,
		},
		{
			name: "multiple -C same path",
			args: []string{
				"git", "-C", "/home/user/project",
				"-C", "/home/user/project", "status",
			},
			wantNorm: []string{"git", "status"},
			wantOK:   true,
		},
		{
			name: "multiple -C one wrong",
			args: []string{
				"git", "-C", "/home/user/project",
				"-C", "/other", "status",
			},
			wantNorm: nil,
			wantOK:   false,
		},
		{
			name: "global -C keeps local -C on subcommand",
			args: []string{
				"git", "-C", "/home/user/project",
				"log", "-C", "-1",
			},
			wantNorm: []string{"git", "log", "-C", "-1"},
			wantOK:   true,
		},
		{
			name: "global -c value before -C is preserved",
			args: []string{
				"git", "-c", "foo.bar=baz", "-C",
				"/home/user/project", "status",
			},
			wantNorm: []string{
				"git", "-c", "foo.bar=baz", "status",
			},
			wantOK: true,
		},
		{
			name: "-C before -- with files after",
			args: []string{
				"git", "-C", "/home/user/project",
				"status", "--", "-C",
			},
			wantNorm: []string{
				"git", "status", "--", "-C",
			},
			wantOK: true,
		},
		{
			name: "global -- is preserved after stripping path flags",
			args: []string{
				"git", "-C", "/home/user/project",
				"--", "status",
			},
			wantNorm: []string{
				"git", "--", "status",
			},
			wantOK: true,
		},
		{
			name: "--work-tree before -- with --git-dir file",
			args: []string{
				"git",
				"--work-tree=/home/user/project",
				"diff", "--", "--git-dir=foo",
			},
			wantNorm: []string{
				"git", "diff", "--", "--git-dir=foo",
			},
			wantOK: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := make([]string, 0, len(tt.args))
			for _, arg := range tt.args {
				args = append(args, rewriteArg(arg))
			}

			norm, ok := normalizeGitCommand(args, ctx)
			if ok != tt.wantOK {
				t.Errorf("ok = %v, want %v", ok, tt.wantOK)
			}
			if !reflect.DeepEqual(norm, tt.wantNorm) {
				t.Errorf(
					"norm = %v, want %v",
					norm, tt.wantNorm,
				)
			}
		})
	}
}

func TestShellJoin(t *testing.T) {
	tests := []struct {
		name   string
		tokens []string
		want   string
	}{
		{
			name:   "simple",
			tokens: []string{"git", "status"},
			want:   "git status",
		},
		{
			name: "with flags",
			tokens: []string{
				"git", "log", "--oneline", "-n", "5",
			},
			want: "git log --oneline -n 5",
		},
		{
			name:   "single token",
			tokens: []string{"git"},
			want:   "git",
		},
		{
			name: "token with spaces is quoted",
			tokens: []string{
				"git", "commit", "-m", "fix: add spaces",
			},
			want: "git commit -m 'fix: add spaces'",
		},
		{
			name: "token with single quotes",
			tokens: []string{
				"echo", "it's alive",
			},
			want: `echo "it's alive"`,
		},
		{
			name:   "empty string token",
			tokens: []string{"echo", ""},
			want:   "echo ''",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := shellJoin(tt.tokens)
			if got != tt.want {
				t.Errorf(
					"shellJoin(%v) = %q, want %q",
					tt.tokens, got, tt.want,
				)
			}
		})
	}
}

func TestPathMatchesCWD(t *testing.T) {
	cwd := t.TempDir()
	var err error
	cwd, err = filepath.EvalSymlinks(cwd)
	if err != nil {
		t.Fatal(err)
	}

	other := t.TempDir()
	other, err = filepath.EvalSymlinks(other)
	if err != nil {
		t.Fatal(err)
	}

	subdir := filepath.Join(cwd, "sub")
	if err := os.Mkdir(subdir, 0o755); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		path string
		want bool
	}{
		{"exact match", cwd, true},
		{"trailing slash", cwd + "/", true},
		{"different path", other, false},
		{"subdirectory", subdir, false},
		{"parent", filepath.Dir(cwd), false},
		{"relative dot", ".", true},
		{
			"unresolved symlink traversal path",
			cwd + string(filepath.Separator) + "escape" +
				string(filepath.Separator) + "..",
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := pathMatchesCWD(tt.path, cwd)
			if got != tt.want {
				t.Errorf(
					"pathMatchesCWD(%q, %q) = %v, want %v",
					tt.path, cwd, got, tt.want,
				)
			}
		})
	}
}

func TestNormalizeCommand(t *testing.T) {
	cwd := t.TempDir()
	var err error
	cwd, err = filepath.EvalSymlinks(cwd)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(cwd, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}
	ctx, ok := newNormalizeContext(cwd)
	if !ok {
		t.Fatal("newNormalizeContext should succeed")
	}

	other := t.TempDir()
	other, err = filepath.EvalSymlinks(other)
	if err != nil {
		t.Fatal(err)
	}

	rewriteArg := func(arg string) string {
		arg = strings.ReplaceAll(
			arg,
			"/home/user/project/.git",
			filepath.Join(cwd, ".git"),
		)
		arg = strings.ReplaceAll(
			arg,
			"/home/user/project/",
			cwd+string(filepath.Separator),
		)
		arg = strings.ReplaceAll(arg, "/home/user/project", cwd)
		arg = strings.ReplaceAll(arg, "/other", other)
		return arg
	}

	tests := []struct {
		name    string
		args    []string
		wantCmd string
		wantOK  bool
	}{
		{
			name:    "non-git passes through",
			args:    []string{"cat", "file.txt"},
			wantCmd: "cat file.txt",
			wantOK:  true,
		},
		{
			name:    "git without path flags passes through",
			args:    []string{"git", "status"},
			wantCmd: "git status",
			wantOK:  true,
		},
		{
			name: "git with unknown global option is rejected",
			args: []string{
				"git", "--unknown-global", "status",
			},
			wantCmd: "",
			wantOK:  false,
		},
		{
			name: "git with unsupported split form is rejected",
			args: []string{
				"git", "--namespace", "foo", "status",
			},
			wantCmd: "",
			wantOK:  false,
		},
		{
			name: "git with equals-only form passes through",
			args: []string{
				"git", "--namespace=foo", "status",
			},
			wantCmd: "git '--namespace=foo' status",
			wantOK:  true,
		},
		{
			name: "git with -C matching cwd normalizes",
			args: []string{
				"git", "-C", "/home/user/project",
				"status",
			},
			wantCmd: "git status",
			wantOK:  true,
		},
		{
			name: "git with -C wrong path rejected",
			args: []string{
				"git", "-C", "/other", "status",
			},
			wantCmd: "",
			wantOK:  false,
		},
		{
			name:    "empty args rejected",
			args:    []string{},
			wantCmd: "",
			wantOK:  false,
		},
		{
			name:    "ls passes through",
			args:    []string{"ls", "-la"},
			wantCmd: "ls -la",
			wantOK:  true,
		},
		{
			name:    "echo passes through",
			args:    []string{"echo", "hello"},
			wantCmd: "echo hello",
			wantOK:  true,
		},
		{
			name: "git with git-dir matching cwd normalizes",
			args: []string{
				"git",
				"--git-dir=/home/user/project/.git",
				"status",
			},
			wantCmd: "git status",
			wantOK:  true,
		},
		{
			name: "git with work-tree wrong path rejected",
			args: []string{
				"git", "--work-tree=/other", "status",
			},
			wantCmd: "",
			wantOK:  false,
		},
		{
			name: "local --git-dir after subcommand passes through",
			args: []string{
				"git", "rev-parse", "--git-dir",
			},
			wantCmd: "git rev-parse --git-dir",
			wantOK:  true,
		},
		{
			name: "local -C after subcommand passes through",
			args: []string{
				"git", "log", "-C", "-1",
			},
			wantCmd: "git log -C -1",
			wantOK:  true,
		},
		{
			name: "global -C with local -C keeps local flag",
			args: []string{
				"git", "-C", "/home/user/project",
				"log", "-C", "-1",
			},
			wantCmd: "git log -C -1",
			wantOK:  true,
		},
		{
			name: "global -- is preserved when path flags stripped",
			args: []string{
				"git", "-C", "/home/user/project",
				"--", "status",
			},
			wantCmd: "git -- status",
			wantOK:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			args := make([]string, 0, len(tt.args))
			for _, arg := range tt.args {
				args = append(args, rewriteArg(arg))
			}

			cmd, ok := normalizeCommand(args, ctx)
			if ok != tt.wantOK {
				t.Errorf("ok = %v, want %v", ok, tt.wantOK)
			}
			if cmd != tt.wantCmd {
				t.Errorf(
					"cmd = %q, want %q",
					cmd, tt.wantCmd,
				)
			}
		})
	}
}

func TestGitDirMatchesCWD(t *testing.T) {
	cwd := t.TempDir()
	var err error
	cwd, err = filepath.EvalSymlinks(cwd)
	if err != nil {
		t.Fatal(err)
	}

	gitDir := filepath.Join(cwd, ".git")
	if err := os.Mkdir(gitDir, 0o755); err != nil {
		t.Fatal(err)
	}

	other := t.TempDir()
	other, err = filepath.EvalSymlinks(other)
	if err != nil {
		t.Fatal(err)
	}

	otherGitDir := filepath.Join(other, ".git")
	if err := os.Mkdir(otherGitDir, 0o755); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		path string
		want bool
	}{
		{"exact .git match", gitDir, true},
		{"trailing slash", gitDir + "/", true},
		{"wrong dir", otherGitDir, false},
		{"cwd not .git", cwd, false},
		{"relative .git", ".git", true},
		{
			"unresolved traversal to .git path",
			cwd + string(filepath.Separator) + "escape" +
				string(filepath.Separator) + ".." +
				string(filepath.Separator) + ".git",
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := gitDirMatchesCWD(tt.path, cwd)
			if got != tt.want {
				t.Errorf(
					"gitDirMatchesCWD(%q, %q) = %v, "+
						"want %v",
					tt.path, cwd, got, tt.want,
				)
			}
		})
	}
}

func TestPathMatchesCWD_Symlinks(t *testing.T) {
	// Create real directory structure for symlink tests.
	realCWD := t.TempDir()
	outside := t.TempDir()

	// Resolve any symlinks in the temp dirs themselves
	// (macOS /tmp -> /private/tmp).
	realCWD, err := filepath.EvalSymlinks(realCWD)
	if err != nil {
		t.Fatal(err)
	}
	outside, err = filepath.EvalSymlinks(outside)
	if err != nil {
		t.Fatal(err)
	}

	// Create symlink inside cwd pointing outside.
	link := filepath.Join(realCWD, "escape")
	if err := os.Symlink(outside, link); err != nil {
		t.Fatal(err)
	}

	// Create symlink pointing directly to cwd.
	cwdLink := filepath.Join(t.TempDir(), "to-cwd")
	if err := os.Symlink(realCWD, cwdLink); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		path string
		cwd  string
		want bool
	}{
		{
			name: "symlink/.. resolves outside cwd",
			path: realCWD + "/escape/..",
			cwd:  realCWD,
			want: false,
		},
		{
			name: "symlink pointing to cwd matches",
			path: cwdLink,
			cwd:  realCWD,
			want: true,
		},
		{
			name: "cwd given as symlinked path resolves",
			path: realCWD,
			cwd:  cwdLink,
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := pathMatchesCWD(tt.path, tt.cwd)
			if got != tt.want {
				t.Errorf(
					"pathMatchesCWD(%q, %q) = %v, "+
						"want %v",
					tt.path, tt.cwd, got, tt.want,
				)
			}
		})
	}
}

func TestGitDirMatchesCWD_Symlinks(t *testing.T) {
	realCWD := t.TempDir()
	outside := t.TempDir()

	realCWD, err := filepath.EvalSymlinks(realCWD)
	if err != nil {
		t.Fatal(err)
	}
	outside, err = filepath.EvalSymlinks(outside)
	if err != nil {
		t.Fatal(err)
	}

	// Create .git dir inside cwd.
	realGitDir := filepath.Join(realCWD, ".git")
	if err := os.Mkdir(realGitDir, 0o755); err != nil {
		t.Fatal(err)
	}

	// Symlink inside cwd pointing outside.
	link := filepath.Join(realCWD, "escape")
	if err := os.Symlink(outside, link); err != nil {
		t.Fatal(err)
	}

	// Symlink pointing directly to the real .git dir.
	gitLink := filepath.Join(t.TempDir(), "link-git")
	if err := os.Symlink(realGitDir, gitLink); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		path string
		cwd  string
		want bool
	}{
		{
			name: "symlink/../.git resolves outside cwd",
			path: realCWD + "/escape/../.git",
			cwd:  realCWD,
			want: false,
		},
		{
			name: "symlink to real .git matches",
			path: gitLink,
			cwd:  realCWD,
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := gitDirMatchesCWD(tt.path, tt.cwd)
			if got != tt.want {
				t.Errorf(
					"gitDirMatchesCWD(%q, %q) = %v, "+
						"want %v",
					tt.path, tt.cwd, got, tt.want,
				)
			}
		})
	}
}

func TestNormalizeCommand_SymlinkBypass(t *testing.T) {
	realCWD := t.TempDir()
	outside := t.TempDir()

	realCWD, err := filepath.EvalSymlinks(realCWD)
	if err != nil {
		t.Fatal(err)
	}
	outside, err = filepath.EvalSymlinks(outside)
	if err != nil {
		t.Fatal(err)
	}

	// Create symlink inside cwd pointing outside.
	link := filepath.Join(realCWD, "escape")
	if err := os.Symlink(outside, link); err != nil {
		t.Fatal(err)
	}

	// git -C symlink/.. status should be rejected because
	// symlink/.. resolves to outside's parent, not cwd.
	args := []string{
		"git", "-C",
		realCWD + "/escape/..",
		"status",
	}

	ctx, ok := newNormalizeContext(realCWD)
	if !ok {
		t.Fatal("newNormalizeContext should succeed")
	}
	cmd, ok := normalizeCommand(args, ctx)
	if ok {
		t.Errorf(
			"normalizeCommand should reject symlink "+
				"traversal, got %q",
			cmd,
		)
	}
}
