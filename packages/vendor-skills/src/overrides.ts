import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillOverrides } from "./types";

const knownOverrideKeys = new Set(["explicitOnly"]);
const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

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

function setFrontmatterKey(
  content: string,
  key: string,
  value: string,
): string {
  const match = frontmatterPattern.exec(content);
  if (!match) {
    throw new Error("SKILL.md has no frontmatter");
  }

  const lines = match[1].split(/\r?\n/);
  const line = `${key}: ${value}`;
  const index = lines.findIndex((candidate) => candidate.startsWith(`${key}:`));
  if (index === -1) {
    lines.push(line);
  } else {
    lines[index] = line;
  }

  const rest = content.slice(match[0].length);
  return `---\n${lines.join("\n")}\n---\n${rest}`;
}

function setCodexImplicitInvocation(content: string, allowed: boolean): string {
  const line = `  allow_implicit_invocation: ${allowed}`;
  const lines = content.split(/\r?\n/);
  const existing = lines.findIndex((candidate) =>
    /^\s+allow_implicit_invocation:/.test(candidate),
  );
  if (existing !== -1) {
    lines[existing] = line;
    return lines.join("\n");
  }

  const policy = lines.findIndex((candidate) => /^policy:\s*$/.test(candidate));
  if (policy !== -1) {
    lines.splice(policy + 1, 0, line);
    return lines.join("\n");
  }

  const body =
    content.length === 0 || content.endsWith("\n") ? content : `${content}\n`;
  return `${body}policy:\n${line}\n`;
}

/**
 * Apply manifest overrides to a staged copy of an upstream skill. `explicitOnly`
 * stops Claude and Codex from loading the skill unless it is named.
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
      readFileSync(skillFile, "utf8"),
      "disable-model-invocation",
      "true",
    ),
  );

  const agentsDir = join(skillDir, "agents");
  const openaiFile = join(agentsDir, "openai.yaml");
  const current = existsSync(openaiFile)
    ? readFileSync(openaiFile, "utf8")
    : "";
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(openaiFile, setCodexImplicitInvocation(current, false));
}
