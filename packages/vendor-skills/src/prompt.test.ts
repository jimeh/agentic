import { EventEmitter } from "node:events";
import { expect, test } from "bun:test";
import { selectSkills } from "./prompt";

class FakeInput extends EventEmitter {
  isTTY = true;
  isRaw = false;
  paused = false;
  resumed = false;

  setRawMode(value: boolean): void {
    this.isRaw = value;
  }

  pause(): this {
    this.paused = true;
    return this;
  }

  resume(): this {
    this.resumed = true;
    return this;
  }
}

class FakeOutput {
  isTTY = true;
  content = "";

  write(value: string): void {
    this.content += value;
  }
}

test("selectSkills pauses input after confirming selection", async () => {
  const input = new FakeInput();
  const output = new FakeOutput();
  const selection = selectSkills(
    [
      {
        name: "example-skill",
        description: "Example skill",
        path: "skills/example-skill",
      },
    ],
    { input: input as never, output: output as never },
  );

  input.emit("keypress", " ", { name: "space" });
  input.emit("keypress", "\r", { name: "return" });

  await expect(selection).resolves.toEqual([
    {
      name: "example-skill",
      description: "Example skill",
      path: "skills/example-skill",
    },
  ]);
  expect(input.resumed).toBe(true);
  expect(input.paused).toBe(true);
  expect(input.isRaw).toBe(false);
});
