import readline from "node:readline";
import type { DiscoveredSkill } from "./discover";

type PromptStreams = {
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
};

function render(
  output: NodeJS.WriteStream,
  skills: DiscoveredSkill[],
  selected: Set<number>,
  cursor: number,
): void {
  output.write("\x1b[2J\x1b[H");
  output.write("Select skills to add\n\n");
  for (const [index, skill] of skills.entries()) {
    const pointer = index === cursor ? ">" : " ";
    const mark = selected.has(index) ? "x" : " ";
    output.write(`${pointer} [${mark}] ${skill.name}\n`);
    output.write(`      ${skill.description}\n`);
  }
  output.write("\nspace: toggle  a: all  enter: confirm  q: cancel\n");
}

/** Prompt for a multi-select skill choice in an interactive terminal. */
export function selectSkills(
  skills: DiscoveredSkill[],
  streams: PromptStreams = { input: process.stdin, output: process.stdout },
): Promise<DiscoveredSkill[]> {
  const { input, output } = streams;
  if (!input.isTTY || !output.isTTY) {
    throw new Error("pass --skill when not running in an interactive terminal");
  }

  readline.emitKeypressEvents(input);
  const previousRawMode = input.isRaw;
  input.setRawMode(true);
  input.resume();

  let cursor = 0;
  const selected = new Set<number>();
  render(output, skills, selected, cursor);

  return new Promise((resolve, reject) => {
    function cleanup(): void {
      input.setRawMode(previousRawMode);
      input.off("keypress", onKeypress);
      input.pause();
      output.write("\x1b[2J\x1b[H");
    }

    function onKeypress(_: string, key: readline.Key): void {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("cancelled"));
        return;
      }

      if (key.name === "q") {
        cleanup();
        reject(new Error("cancelled"));
        return;
      }

      if (key.name === "up") {
        cursor = Math.max(0, cursor - 1);
      } else if (key.name === "down") {
        cursor = Math.min(skills.length - 1, cursor + 1);
      } else if (key.name === "space") {
        if (selected.has(cursor)) {
          selected.delete(cursor);
        } else {
          selected.add(cursor);
        }
      } else if (key.name === "a") {
        if (selected.size === skills.length) {
          selected.clear();
        } else {
          for (const index of skills.keys()) {
            selected.add(index);
          }
        }
      } else if (key.name === "return") {
        cleanup();
        resolve([...selected].sort().map((index) => skills[index]));
        return;
      }

      render(output, skills, selected, cursor);
    }

    input.on("keypress", onKeypress);
  });
}
