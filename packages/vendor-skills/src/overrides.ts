import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { join } from "node:path";
import matter from "gray-matter";
import type { SkillOverrides } from "./types";

const knownOverrideKeys = new Set(["explicitOnly"]);
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

type YamlMap = Record<string, unknown>;

/** Assert that a manifest skill's overrides use only supported keys and types. */
export function validateOverrides(value: unknown, context: string): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context}: overrides must be an object`);
  }

  for (const [key, setting] of Object.entries(value)) {
    if (!knownOverrideKeys.has(key)) {
      throw new Error(`${context}: unknown override '${key}'`);
    }
    if (typeof setting !== "boolean") {
      throw new Error(`${context}: override '${key}' must be a boolean`);
    }
  }
}

/** Parse a YAML mapping; duplicate keys and malformed YAML throw. */
export function parseYamlMap(yaml: string): YamlMap {
  const { data } = matter(`---\n${yaml}\n---\n`, {});
  return structuredClone(data) as YamlMap;
}

function withoutPath(map: YamlMap, path: string[]): YamlMap {
  const copy = structuredClone(map);
  let node: YamlMap = copy;
  for (const key of path.slice(0, -1)) {
    const next = node[key];
    if (next === null || next === undefined) {
      delete node[key];
      return copy;
    }
    if (typeof next !== "object") {
      return copy;
    }
    node = next as YamlMap;
  }
  delete node[path[path.length - 1]];
  if (path.length > 1 && Object.keys(node).length === 0) {
    return withoutPath(copy, path.slice(0, -1));
  }
  return copy;
}

function valueAt(map: YamlMap, path: string[]): unknown {
  let node: unknown = map;
  for (const key of path) {
    if (typeof node !== "object" || node === null) {
      return undefined;
    }
    node = (node as YamlMap)[key];
  }
  return node;
}

/**
 * Check that an edit set `path` to `value` and changed nothing else. The text
 * edits below only handle plain block YAML, so anything else fails here
 * instead of producing a file that silently means something different.
 */
function assertOnlyChanged(
  file: string,
  before: string,
  after: string,
  path: string[],
  value: unknown,
): void {
  let original: YamlMap;
  let edited: YamlMap;
  try {
    original = parseYamlMap(before);
    edited = parseYamlMap(after);
  } catch (error) {
    const message =
      error instanceof Error ? error.message.split("\n")[0] : String(error);
    throw new Error(`${file}: cannot apply explicitOnly (${message})`);
  }

  if (
    valueAt(edited, path) !== value ||
    !isDeepStrictEqual(withoutPath(original, path), withoutPath(edited, path))
  ) {
    throw new Error(
      `${file}: cannot apply explicitOnly to this YAML shape; set ${path.join(".")} upstream instead`,
    );
  }
}

function setFrontmatterKey(
  file: string,
  content: string,
  key: string,
  value: boolean,
): string {
  const match = frontmatterPattern.exec(content);
  if (!match) {
    throw new Error(`${file}: SKILL.md has no frontmatter`);
  }

  const lines = match[1].split(/\r?\n/);
  const line = `${key}: ${value}`;
  const index = lines.findIndex((candidate) =>
    new RegExp(`^${key}\\s*:`).test(candidate),
  );
  if (index === -1) {
    lines.push(line);
  } else {
    lines[index] = line;
  }

  const yaml = lines.join("\n");
  assertOnlyChanged(file, match[1], yaml, [key], value);
  return `---\n${yaml}\n---\n${content.slice(match[0].length)}`;
}

function setCodexImplicitInvocation(
  file: string,
  content: string,
  allowed: boolean,
): string {
  const lines = content.split(/\r?\n/);
  const policy = lines.findIndex((candidate) =>
    /^policy:\s*(#.*)?$/.test(candidate),
  );

  let next: string;
  if (policy === -1) {
    const body =
      content.length === 0 || content.endsWith("\n") ? content : `${content}\n`;
    next = `${body}policy:\n  allow_implicit_invocation: ${allowed}\n`;
  } else {
    let end = policy + 1;
    while (end < lines.length && !/^\S/.test(lines[end])) {
      end += 1;
    }
    const children = lines.slice(policy + 1, end);
    const indent =
      children
        .find((candidate) => candidate.trim() !== "")
        ?.match(/^\s+/)?.[0] ?? "  ";
    const line = `${indent}allow_implicit_invocation: ${allowed}`;
    const existing = children.findIndex((candidate) =>
      candidate.startsWith(`${indent}allow_implicit_invocation:`),
    );
    if (existing === -1) {
      lines.splice(policy + 1, 0, line);
    } else {
      lines[policy + 1 + existing] = line;
    }
    next = lines.join("\n");
  }

  assertOnlyChanged(
    file,
    content,
    next,
    ["policy", "allow_implicit_invocation"],
    allowed,
  );
  return next;
}

/**
 * Apply manifest overrides to a staged copy of an upstream skill. `explicitOnly`
 * stops Claude and Codex from loading the skill on their own; it loads only when
 * the user invokes it, as `/name` in Claude or an explicit mention in Codex.
 */
export function applyOverrides(
  skillDir: string,
  overrides: SkillOverrides | undefined,
): void {
  if (!overrides?.explicitOnly) {
    return;
  }

  const skillFile = join(skillDir, "SKILL.md");
  writeFileSync(
    skillFile,
    setFrontmatterKey(
      skillFile,
      readFileSync(skillFile, "utf8"),
      "disable-model-invocation",
      true,
    ),
  );

  const agentsDir = join(skillDir, "agents");
  const openaiFile = join(agentsDir, "openai.yaml");
  const current = existsSync(openaiFile)
    ? readFileSync(openaiFile, "utf8")
    : "";
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(
    openaiFile,
    setCodexImplicitInvocation(openaiFile, current, false),
  );
}
