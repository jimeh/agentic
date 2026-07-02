#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Writable } from "node:stream";

type StdioMode = "inherit" | "pipe";

type RunOptions = {
  bash?: string;
  rootDir?: string;
  stderr?: Writable;
  stdout?: Writable;
  stdio?: StdioMode;
};

function write(stream: Writable, message: string): void {
  stream.write(message);
}

function pluginDirs(rootDir: string): string[] {
  const pluginsDir = join(rootDir, "plugins");
  if (!existsSync(pluginsDir)) {
    return [];
  }

  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pluginsDir, entry.name));
}

function displayPath(rootDir: string, file: string): string {
  const path = relative(rootDir, file);
  if (path !== "" && !path.startsWith("..")) {
    return path;
  }

  return file;
}

/**
 * Return all plugin shell test files in deterministic order.
 */
export function discoverPluginTests(rootDir = "."): string[] {
  const root = resolve(rootDir);

  return pluginDirs(root)
    .flatMap((pluginDir) => {
      const testsDir = join(pluginDir, "tests");
      if (!existsSync(testsDir)) {
        return [];
      }

      return readdirSync(testsDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".test.sh"))
        .map((entry) => join(testsDir, entry.name));
    })
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Run discovered plugin shell tests and return a process exit code.
 */
export function runPluginTests(options: RunOptions = {}): number {
  const bash = options.bash ?? "bash";
  const rootDir = resolve(options.rootDir ?? ".");
  const stderr = options.stderr ?? process.stderr;
  const stdout = options.stdout ?? process.stdout;
  const stdio = options.stdio ?? "inherit";
  const tests = discoverPluginTests(rootDir);

  if (tests.length === 0) {
    write(stdout, "No plugin tests found.\n");
    return 0;
  }

  let failed = 0;

  for (const testFile of tests) {
    const label = displayPath(rootDir, testFile);
    write(stdout, `::group::${label}\n`);
    const result = spawnSync(bash, [testFile], { cwd: rootDir, stdio });
    write(stdout, "::endgroup::\n");

    if (result.status !== 0) {
      write(stderr, `ERROR: ${label}: test failed\n`);
      failed += 1;
    }
  }

  write(stdout, `\nRan ${tests.length} test file(s), ${failed} failed.\n`);
  return failed > 0 ? 1 : 0;
}

if (import.meta.main) {
  process.exitCode = runPluginTests();
}
