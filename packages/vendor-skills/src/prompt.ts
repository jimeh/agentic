import { autocompleteMultiselect, isCancel } from "@clack/prompts";
import type { DiscoveredSkill } from "./discover";

type PromptStreams = {
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
};

type SkillPromptOption = {
  value: string;
  label?: string;
  hint?: string;
};

function visibleItems(output: NodeJS.WriteStream): number {
  const rows = output.rows ?? 20;
  return Math.max(5, Math.min(12, rows - 8));
}

/** Build searchable multi-select options for discovered skills. */
export function skillPromptOptions(
  skills: DiscoveredSkill[],
): SkillPromptOption[] {
  return skills.map((skill) => ({
    value: skill.name,
    label: skill.name,
    hint: skill.path,
  }));
}

/** Match skill options by name, path, or description. */
export function skillPromptFilter(
  search: string,
  option: SkillPromptOption,
  skills: DiscoveredSkill[],
): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  const skill = skills.find((candidate) => candidate.name === option.value);
  return [
    option.label ?? option.value,
    option.hint ?? "",
    skill?.description ?? "",
  ].some((value) => value.toLowerCase().includes(needle));
}

/** Prompt for a searchable multi-select skill choice in a terminal. */
export async function selectSkills(
  skills: DiscoveredSkill[],
  streams: PromptStreams = { input: process.stdin, output: process.stdout },
): Promise<DiscoveredSkill[]> {
  const { input, output } = streams;
  if (!input.isTTY || !output.isTTY) {
    throw new Error("pass --skill when not running in an interactive terminal");
  }

  const selected = await autocompleteMultiselect({
    input,
    output,
    message: "Select skills to add",
    options: skillPromptOptions(skills),
    placeholder: "Type to search by name, path, or description",
    maxItems: visibleItems(output),
    required: false,
    filter: (search, option) => skillPromptFilter(search, option, skills),
  });

  if (isCancel(selected)) {
    throw new Error("cancelled");
  }

  const byName = new Map(skills.map((skill) => [skill.name, skill]));
  return selected.map((name) => byName.get(name)!);
}
