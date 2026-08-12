import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import matter from "gray-matter";

/** Frontmatter marker identifying a Markdown file as a render target. */
const RULES_TYPE = "agentic-rules";

/** Directory holding rule sources, relative to the repository root. */
const SOURCE_DIR = "rules";

/** Directory receiving rendered output, relative to the repository root. */
const OUTPUT_DIR = "generated";

/**
 * Files under the source directory that are neither render targets nor
 * included by one. Documentation lives alongside the sources it describes.
 */
const ORPHAN_EXEMPT = new Set(["README.md"]);

/** Maximum include nesting depth, guarding against pathological chains. */
const MAX_INCLUDE_DEPTH = 32;

const INCLUDE_PATTERN =
  /^[ \t]*<!--[ \t]*include:[ \t]*(.+?)[ \t]*-->[ \t]*$/gm;

type Source = {
  /** Absolute path to the Markdown source. */
  path: string;
  /** Output file name within the generated directory. */
  filename: string;
};

function markdownFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...markdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      found.push(path);
    }
  }

  return found.sort();
}

function parse(path: string): { data: Record<string, unknown>; body: string } {
  try {
    const { data, content } = matter(readFileSync(path, "utf8"));
    return { data: data as Record<string, unknown>, body: content };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: invalid frontmatter (${message})`);
  }
}

/**
 * Resolve an include target, rejecting anything outside the source directory.
 *
 * Confining resolution to the source tree keeps a malformed include from
 * reaching home-directory files or repository secrets.
 */
function resolveInclude(
  sourceDir: string,
  fromPath: string,
  target: string,
): string {
  const resolved = resolve(dirname(fromPath), target);
  if (resolved !== sourceDir && !resolved.startsWith(`${sourceDir}${sep}`)) {
    throw new Error(
      `${fromPath}: include '${target}' resolves outside ${SOURCE_DIR}/`,
    );
  }
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new Error(`${fromPath}: include '${target}' not found`);
  }

  return resolved;
}

/**
 * Expand `<!-- include: path -->` directives, returning the rendered body and
 * recording every file reached so unreferenced sources can be reported.
 */
function expand(
  sourceDir: string,
  path: string,
  seen: Set<string>,
  stack: string[],
): string {
  if (stack.includes(path)) {
    const cycle = [...stack, path]
      .map((entry) => relative(sourceDir, entry))
      .join(" → ");
    throw new Error(`include cycle: ${cycle}`);
  }
  if (stack.length >= MAX_INCLUDE_DEPTH) {
    throw new Error(`${path}: include nesting exceeds ${MAX_INCLUDE_DEPTH}`);
  }

  const { body } = parse(path);
  const nextStack = [...stack, path];

  return body.replace(INCLUDE_PATTERN, (_match, target: string) => {
    const included = resolveInclude(sourceDir, path, target);
    seen.add(included);
    return expand(sourceDir, included, seen, nextStack).trim();
  });
}

/**
 * Collapse the blank-line runs left where an include expanded to nothing, so an
 * empty shared source does not leave a gap in the rendered output.
 */
function normalize(content: string): string {
  return `${content.replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** Collect every Markdown file under `rules/` that declares a render target. */
function collectSources(sourceDir: string): Source[] {
  const sources: Source[] = [];
  const byFilename = new Map<string, string>();

  for (const path of markdownFiles(sourceDir)) {
    const { data } = parse(path);
    if (data.type !== RULES_TYPE) {
      continue;
    }

    const filename = data.filename;
    if (typeof filename !== "string" || filename.trim() === "") {
      throw new Error(`${path}: missing frontmatter filename`);
    }
    if (filename.includes("/") || filename.includes(sep)) {
      throw new Error(
        `${path}: filename '${filename}' must be a bare file name`,
      );
    }

    const existing = byFilename.get(filename);
    if (existing) {
      throw new Error(
        `duplicate filename '${filename}': ${existing} and ${path}`,
      );
    }

    byFilename.set(filename, path);
    sources.push({ path, filename });
  }

  return sources;
}

type Rendered = {
  source: Source;
  output: string;
  content: string;
};

/**
 * Render every declared target, validating that each source is reachable.
 *
 * A Markdown file under `rules/` that neither declares a target nor is included
 * by one is almost always a mistake — typically a typo in the frontmatter that
 * silently drops a target from the build.
 */
function render(rootDir: string): Rendered[] {
  const sourceDir = resolve(rootDir, SOURCE_DIR);
  const sources = collectSources(sourceDir);
  const seen = new Set(sources.map((source) => source.path));

  const rendered = sources.map((source) => ({
    source,
    output: join(rootDir, OUTPUT_DIR, source.filename),
    content: normalize(expand(sourceDir, source.path, seen, [])),
  }));

  const orphans = markdownFiles(sourceDir).filter((path) => {
    const rel = relative(sourceDir, path);
    return !seen.has(path) && !ORPHAN_EXEMPT.has(rel);
  });
  if (orphans.length > 0) {
    const list = orphans.map((path) => relative(rootDir, path)).join(", ");
    throw new Error(
      `unreferenced rule sources (no frontmatter target, not included): ${list}`,
    );
  }

  return rendered;
}

/** Report generated files no longer claimed by any source. */
function staleOutputs(rootDir: string, rendered: Rendered[]): string[] {
  const outputDir = join(rootDir, OUTPUT_DIR);
  if (!existsSync(outputDir)) {
    return [];
  }

  const expected = new Set(rendered.map((entry) => entry.source.filename));

  return readdirSync(outputDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        !expected.has(entry.name) &&
        !ORPHAN_EXEMPT.has(entry.name),
    )
    .map((entry) => join(outputDir, entry.name))
    .sort();
}

export function buildRules(root: string): void {
  const rootDir = resolve(root);
  const rendered = render(rootDir);

  for (const entry of rendered) {
    mkdirSync(dirname(entry.output), { recursive: true });
    writeFileSync(entry.output, entry.content);
  }
}

export function checkRules(root: string): boolean {
  const rootDir = resolve(root);
  const rendered = render(rootDir);
  let ok = true;

  for (const entry of rendered) {
    let actual = "";
    try {
      actual = readFileSync(entry.output, "utf8");
    } catch {
      console.error(
        `ERROR: ${entry.output} is missing; run agent-config rules build`,
      );
      ok = false;
      continue;
    }

    if (actual !== entry.content) {
      console.error(
        `ERROR: ${entry.output} is stale; run agent-config rules build`,
      );
      ok = false;
    }
  }

  for (const stale of staleOutputs(rootDir, rendered)) {
    console.error(`ERROR: ${stale} is not claimed by any rule source`);
    ok = false;
  }

  return ok;
}

function usage(exitCode = 2): never {
  console.error(
    [
      "Usage: agent-config rules <build|check> [options]",
      "",
      "Options:",
      "  --root   Repository root (default: current directory)",
      "  --help   Show help",
    ].join("\n"),
  );
  process.exit(exitCode);
}

function parseArgs(args: string[]): {
  command: "build" | "check";
  root: string;
} {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    usage(command ? 0 : 2);
  }
  if (command !== "build" && command !== "check") {
    console.error(`ERROR: Unknown rules command: ${command}`);
    usage();
  }

  let root = process.cwd();

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--root") {
      const value = args[i + 1];
      if (!value || value.startsWith("-")) {
        usage();
      }
      root = resolve(value);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else {
      console.error(`ERROR: Unknown argument: ${arg}`);
      usage();
    }
  }

  return { command, root: resolve(root) };
}

export function rulesCommand(args: string[]): number {
  const { command, root } = parseArgs(args);

  if (command === "check") {
    return checkRules(root) ? 0 : 1;
  }

  buildRules(root);

  return 0;
}
