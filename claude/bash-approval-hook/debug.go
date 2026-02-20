package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const defaultDebugLogFileName = "bash-approval-hook.debug.log"

// debugLogEnabled is compile-time configured via -ldflags:
//
//	-X main.debugLogEnabled=true
var debugLogEnabled = "false"

var debugLogFileName = defaultDebugLogFileName
var executablePathResolver = os.Executable

type hookDebugLogger struct {
	file *os.File
}

func newHookDebugLogger() *hookDebugLogger {
	if !isDebugLoggingEnabled() {
		return &hookDebugLogger{}
	}

	execPath, err := executablePathResolver()
	if err != nil {
		return &hookDebugLogger{}
	}

	logPath := filepath.Join(
		filepath.Dir(execPath),
		debugLogFileName,
	)
	file, err := os.OpenFile(
		logPath,
		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
		0o644,
	)
	if err != nil {
		return &hookDebugLogger{}
	}

	logger := &hookDebugLogger{file: file}
	logger.logf("debug logging enabled log_path=%q", logPath)
	return logger
}

func isDebugLoggingEnabled() bool {
	switch strings.ToLower(strings.TrimSpace(debugLogEnabled)) {
	case "1", "on", "true", "yes":
		return true
	default:
		return false
	}
}

func (l *hookDebugLogger) close() {
	if l == nil || l.file == nil {
		return
	}
	_ = l.file.Close()
	l.file = nil
}

func (l *hookDebugLogger) logf(format string, args ...any) {
	if l == nil || l.file == nil {
		return
	}

	line := fmt.Sprintf(format, args...)
	ts := time.Now().UTC().Format(time.RFC3339Nano)
	_, _ = fmt.Fprintf(
		l.file,
		"%s pid=%d %s\n",
		ts,
		os.Getpid(),
		line,
	)
}
