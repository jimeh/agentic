package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestIsDebugLoggingEnabled(t *testing.T) {
	tests := []struct {
		name  string
		value string
		want  bool
	}{
		{name: "false default", value: "false", want: false},
		{name: "true", value: "true", want: true},
		{name: "uppercase true", value: "TRUE", want: true},
		{name: "one", value: "1", want: true},
		{name: "yes", value: "yes", want: true},
		{name: "on", value: "on", want: true},
		{name: "unexpected value", value: "debug", want: false},
	}

	orig := debugLogEnabled
	t.Cleanup(func() {
		debugLogEnabled = orig
	})

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			debugLogEnabled = tt.value
			got := isDebugLoggingEnabled()
			if got != tt.want {
				t.Fatalf(
					"isDebugLoggingEnabled() = %v, want %v",
					got, tt.want,
				)
			}
		})
	}
}

func TestNewHookDebugLoggerWritesToExecutableDir(t *testing.T) {
	tmpDir := t.TempDir()
	logFile := filepath.Join(tmpDir, "hook-debug.log")
	execPath := filepath.Join(tmpDir, "bash-approval-hook")

	origEnabled := debugLogEnabled
	origLogName := debugLogFileName
	origExecResolver := executablePathResolver
	t.Cleanup(func() {
		debugLogEnabled = origEnabled
		debugLogFileName = origLogName
		executablePathResolver = origExecResolver
	})

	debugLogEnabled = "true"
	debugLogFileName = filepath.Base(logFile)
	executablePathResolver = func() (string, error) {
		return execPath, nil
	}

	logger := newHookDebugLogger()
	logger.logf("normalize step complete")
	logger.close()

	data, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatalf("expected log file, got error: %v", err)
	}
	content := string(data)
	if !strings.Contains(content, "debug logging enabled") {
		t.Fatalf("expected setup line, got: %q", content)
	}
	if !strings.Contains(content, "normalize step complete") {
		t.Fatalf("expected log line, got: %q", content)
	}
}

func TestNewHookDebugLoggerFailsClosedOnExecutableError(t *testing.T) {
	tmpDir := t.TempDir()
	logFile := filepath.Join(tmpDir, "hook-debug.log")

	origEnabled := debugLogEnabled
	origLogName := debugLogFileName
	origExecResolver := executablePathResolver
	t.Cleanup(func() {
		debugLogEnabled = origEnabled
		debugLogFileName = origLogName
		executablePathResolver = origExecResolver
	})

	debugLogEnabled = "true"
	debugLogFileName = filepath.Base(logFile)
	executablePathResolver = func() (string, error) {
		return "", errors.New("boom")
	}

	logger := newHookDebugLogger()
	logger.logf("this should not be written")
	logger.close()

	if _, err := os.Stat(logFile); !os.IsNotExist(err) {
		t.Fatalf("expected no log file, got err=%v", err)
	}
}
