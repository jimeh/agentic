import { expect, test } from "bun:test";
import { skillPromptFilter, skillPromptOptions, selectSkills } from "./prompt";

const skills = [
  {
    name: "react-best-practices",
    description: "React and Next.js performance guidance",
    path: "skills/react-best-practices",
  },
  {
    name: "rust-best-practices",
    description: "Rust guidance",
    path: "skills/rust-best-practices",
  },
];

async function expectRejects(
  promise: Promise<unknown>,
  message: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(message);
    return;
  }

  throw new Error("expected promise to reject");
}

test("skillPromptOptions renders names with path hints", () => {
  expect(skillPromptOptions(skills)).toEqual([
    {
      value: "react-best-practices",
      label: "react-best-practices",
      hint: "skills/react-best-practices",
    },
    {
      value: "rust-best-practices",
      label: "rust-best-practices",
      hint: "skills/rust-best-practices",
    },
  ]);
});

test("skillPromptFilter searches name, path, and description", () => {
  const [react, rust] = skillPromptOptions(skills);

  expect(skillPromptFilter("react", react, skills)).toBe(true);
  expect(skillPromptFilter("performance", react, skills)).toBe(true);
  expect(skillPromptFilter("skills/rust", rust, skills)).toBe(true);
  expect(skillPromptFilter("python", rust, skills)).toBe(false);
});

test("selectSkills rejects non-interactive streams", async () => {
  await expectRejects(
    selectSkills(skills, {
      input: { isTTY: false } as never,
      output: { isTTY: true } as never,
    }),
    "pass --skill",
  );
});
