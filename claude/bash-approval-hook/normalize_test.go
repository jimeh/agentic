package main

import (
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
	cwd := "/home/user/project"

	tests := []struct {
		name     string
		args     []string
		wantNorm []string
		wantOK   bool
	}{
		// ---- No global path flags (pass-through) ----
		{
			name: "no path flags passes through",
			args: []string{"git", "status"},
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
			norm, ok := normalizeGitCommand(tt.args, cwd)
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
	cwd := "/home/user/project"

	tests := []struct {
		name string
		path string
		want bool
	}{
		{"exact match", "/home/user/project", true},
		{"trailing slash", "/home/user/project/", true},
		{"different path", "/other/project", false},
		{"subdirectory", "/home/user/project/sub", false},
		{"parent", "/home/user", false},
		{"relative dot", ".", true},
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
	cwd := "/home/user/project"

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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd, ok := normalizeCommand(tt.args, cwd)
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
	cwd := "/home/user/project"

	tests := []struct {
		name string
		path string
		want bool
	}{
		{
			"exact .git match",
			"/home/user/project/.git", true,
		},
		{
			"trailing slash",
			"/home/user/project/.git/", true,
		},
		{
			"wrong dir",
			"/other/project/.git", false,
		},
		{
			"cwd not .git",
			"/home/user/project", false,
		},
		{
			"relative .git",
			".git", true,
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
