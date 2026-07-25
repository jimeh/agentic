import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

const cli = join(import.meta.dir, "..", "bin", "agent-config.ts");
const bun = process.execPath;
let tempDirs: string[] = [];

function createProject(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "agentic-rules-"));
  tempDirs.push(root);
  mkdirSync(join(root, "rules"), { recursive: true });

  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }

  return root;
}

function target(filename: string, body: string): string {
  return `---\ntype: agentic-rules\nfilename: ${filename}\n---\n\n${body}`;
}

function run(args: string[], cwd: string) {
  return spawnSync(bun, [cli, "rules", ...args, "--root", cwd], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function output(root: string, filename: string): string {
  return readFileSync(join(root, "generated", filename), "utf8");
}

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

test("renders every source declaring a target", () => {
  const root = createProject({
    "rules/base.md": "# Base\n\nShared.\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: base.md -->\n"),
    "rules/codex.md": target("CODEX.md", "<!-- include: base.md -->\n"),
  });

  const result = run(["build"], root);

  expect(result.status).toBe(0);
  expect(output(root, "CLAUDE.md")).toBe("# Base\n\nShared.\n");
  expect(output(root, "CODEX.md")).toBe("# Base\n\nShared.\n");
});

test("ignores sources without the agentic-rules marker", () => {
  const root = createProject({
    "rules/base.md": "# Base\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: base.md -->\n"),
  });

  expect(run(["build"], root).status).toBe(0);
  expect(() => output(root, "base.md")).toThrow();
});

test("expands nested includes", () => {
  const root = createProject({
    "rules/base.md": "# Base\n\n<!-- include: shared/extra.md -->\n",
    "rules/shared/extra.md": "Nested content.\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: base.md -->\n"),
  });

  const result = run(["build"], root);

  expect(result.status).toBe(0);
  expect(output(root, "CLAUDE.md")).toContain("Nested content.");
});

test("resolves includes relative to the including file", () => {
  const root = createProject({
    "rules/shared/one.md": "One.\n\n<!-- include: two.md -->\n",
    "rules/shared/two.md": "Two.\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: shared/one.md -->\n"),
  });

  const result = run(["build"], root);

  expect(result.status).toBe(0);
  expect(output(root, "CLAUDE.md")).toContain("One.");
  expect(output(root, "CLAUDE.md")).toContain("Two.");
});

test("strips frontmatter from rendered output", () => {
  const root = createProject({
    "rules/base.md": "---\nnote: keep out\n---\n\n# Base\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: base.md -->\n"),
  });

  expect(run(["build"], root).status).toBe(0);

  const rendered = output(root, "CLAUDE.md");
  expect(rendered.startsWith("# Base")).toBe(true);
  expect(rendered).not.toContain("---");
  expect(rendered).not.toContain("keep out");
});

test("fails on include cycles instead of hanging", () => {
  const root = createProject({
    "rules/base.md": "<!-- include: loop.md -->\n",
    "rules/loop.md": "<!-- include: base.md -->\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: base.md -->\n"),
  });

  const result = run(["build"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("include cycle");
});

test("rejects includes resolving outside the rules directory", () => {
  const root = createProject({
    "secrets.md": "TOP SECRET\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: ../secrets.md -->\n"),
  });

  const result = run(["build"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("resolves outside");
});

test("rejects duplicate output filenames", () => {
  const root = createProject({
    "rules/one.md": target("CLAUDE.md", "One.\n"),
    "rules/two.md": target("CLAUDE.md", "Two.\n"),
  });

  const result = run(["build"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("duplicate filename");
});

test("rejects a target without a filename", () => {
  const root = createProject({
    "rules/claude.md": "---\ntype: agentic-rules\n---\n\nBody.\n",
  });

  const result = run(["build"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("missing frontmatter filename");
});

test("reports sources that are neither targets nor included", () => {
  const root = createProject({
    "rules/base.md": "# Base\n",
    "rules/stray.md": "Orphaned.\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: base.md -->\n"),
  });

  const result = run(["build"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("unreferenced rule sources");
  expect(result.stderr).toContain("stray.md");
});

test("exempts README.md and vendored directories from the orphan check", () => {
  const root = createProject({
    "rules/README.md": "# Docs\n",
    "rules/rtk/claude.md": "# RTK\n",
    "rules/claude.md": target("CLAUDE.md", "Body.\n"),
  });

  expect(run(["build"], root).status).toBe(0);
});

test("check reports generated files no source claims", () => {
  const root = createProject({
    "rules/claude.md": target("CLAUDE.md", "Body.\n"),
  });
  expect(run(["build"], root).status).toBe(0);
  writeFileSync(join(root, "generated", "AGENTS.md"), "orphaned\n");

  const result = run(["check"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("not claimed by any rule source");
});

test("check fails when generated files are stale", () => {
  const root = createProject({
    "rules/claude.md": target("CLAUDE.md", "Body.\n"),
  });
  expect(run(["build"], root).status).toBe(0);
  writeFileSync(join(root, "generated", "CLAUDE.md"), "stale\n");

  const result = run(["check"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("is stale");
});

test("check fails when a generated file is missing", () => {
  const root = createProject({
    "rules/claude.md": target("CLAUDE.md", "Body.\n"),
  });

  const result = run(["check"], root);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("is missing");
});

test("check passes for freshly built output", () => {
  const root = createProject({
    "rules/base.md": "# Base\n",
    "rules/claude.md": target("CLAUDE.md", "<!-- include: base.md -->\n"),
  });

  expect(run(["build"], root).status).toBe(0);
  expect(run(["check"], root).status).toBe(0);
});
