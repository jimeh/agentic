import { expect, test } from "bun:test";
import { evidenceRank, parseDataset, rankKeywords } from "./ranking";

test("keyword baseline ranks evidence and does not invent a missing target", () => {
  const candidates = [
    { id: "a", text: "The release succeeded.", source: "fixture:1" },
    {
      id: "b",
      text: "The cancellation regression was reproduced.",
      source: "fixture:2",
    },
    { id: "c", text: "Release packaging changed.", source: "fixture:3" },
  ];
  const ranked = rankKeywords(
    candidates,
    "reproduced cancellation regression",
  ).map((c) => c.id);
  expect(ranked[0]).toBe("b");
  expect(evidenceRank(ranked, ["b"])).toBe(1);
  expect(evidenceRank(ranked.slice(1), ["b"])).toBeNull();
  expect(evidenceRank(ranked, ["absent"])).toBeNull();
});

test("trial rejects aliases, invalid labels and excessive query counts", () => {
  const dataset = {
    model: "jev-1.13.0",
    candidates: [{ id: "a", text: "evidence", source: "fixture:1" }],
    queries: [{ id: "q", text: "query", relevant: ["a"], split: "held-out" }],
  };
  expect(parseDataset(dataset).model).toBe("jev-1.13.0");
  expect(() => parseDataset({ ...dataset, model: "jev-latest" })).toThrow();
  expect(() =>
    parseDataset({
      ...dataset,
      queries: [{ ...dataset.queries[0], relevant: ["unknown"] }],
    }),
  ).toThrow();
  expect(() =>
    parseDataset({ ...dataset, queries: Array(7).fill(dataset.queries[0]) }),
  ).toThrow();
});
