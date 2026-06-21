import { expect, test } from "bun:test";
import type { Manifest, VendorPaths } from "./types";
import { selectedSources, validateManifest } from "./manifest";

const paths: VendorPaths = {
  root: "/repo",
  manifestPath: "/repo/thirdparty/skills.manifest.json",
  lockPath: "/repo/thirdparty/skills.lock.json",
  vendorRoot: "/repo/thirdparty/skills",
};

function manifest(overrides: Partial<Manifest> = {}): Manifest {
  return {
    version: 1,
    sources: [
      {
        id: "source-one",
        type: "git",
        url: "/tmp/upstream",
        ref: "main",
        skills: [{ name: "example-skill", path: "skills/example-skill" }],
      },
    ],
    ...overrides,
  };
}

test("validateManifest accepts a valid manifest", () => {
  expect(() => validateManifest(manifest(), paths)).not.toThrow();
});

test("validateManifest rejects duplicate skill names", () => {
  const invalid = manifest({
    sources: [
      manifest().sources[0],
      {
        id: "source-two",
        type: "git",
        url: "/tmp/other",
        ref: "main",
        skills: [{ name: "example-skill", path: "skills/other" }],
      },
    ],
  });

  expect(() => validateManifest(invalid, paths)).toThrow("duplicate skill");
});

test("validateManifest rejects unsafe paths", () => {
  const invalid = manifest({
    sources: [
      {
        ...manifest().sources[0],
        skills: [{ name: "example-skill", path: "../escape" }],
      },
    ],
  });

  expect(() => validateManifest(invalid, paths)).toThrow("must stay inside");
});

test("validateManifest rejects Windows and UNC absolute paths", () => {
  for (const path of ["C:\\skills\\example-skill", "\\\\server\\share"]) {
    const invalid = manifest({
      sources: [
        {
          ...manifest().sources[0],
          skills: [{ name: "example-skill", path }],
        },
      ],
    });

    expect(() => validateManifest(invalid, paths)).toThrow("must stay inside");
  }
});

test("validateManifest rejects invalid skill refs", () => {
  const invalid = manifest({
    sources: [
      {
        ...manifest().sources[0],
        skills: [{ name: "example-skill", path: "skills/example", ref: 123 }],
      },
    ],
  } as unknown as Partial<Manifest>);

  expect(() => validateManifest(invalid, paths)).toThrow("empty ref");
});

test("selectedSources rejects unknown filters", () => {
  expect(() =>
    selectedSources(manifest(), {
      dryRun: false,
      check: false,
      filter: new Set(["missing-skill"]),
    }),
  ).toThrow("unknown skill filter");
});
