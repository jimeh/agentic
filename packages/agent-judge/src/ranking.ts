export type Candidate = { id: string; text: string; source: string };
export type Query = {
  id: string;
  text: string;
  relevant: string[];
  split: "calibration" | "held-out";
};
export type Dataset = {
  model: string;
  candidates: Candidate[];
  queries: Query[];
};

const stopwords = new Set(
  "a an and are as at be by for from had has have how i in is it its of on or that the their this to was were what when which why with".split(
    " ",
  ),
);
function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_]+/g) ?? []).filter(
    (word) => !stopwords.has(word),
  );
}

/** BM25 with k1=1.2, b=0.75; ties preserve corpus order. */
export function rankKeywords(
  candidates: Candidate[],
  query: string,
): Candidate[] {
  const docs = candidates.map((c) => words(c.text));
  const average =
    docs.reduce((n, d) => n + d.length, 0) / (docs.length || 1) || 1;
  const terms = [...new Set(words(query))];
  const df = new Map(
    terms.map((term) => [term, docs.filter((d) => d.includes(term)).length]),
  );
  return candidates
    .map((candidate, i) => {
      const doc = docs[i];
      const score = terms.reduce((sum, term) => {
        const frequency = doc.filter((w) => w === term).length;
        const count = df.get(term)!;
        const idf = Math.log(1 + (docs.length - count + 0.5) / (count + 0.5));
        return (
          sum +
          (idf * frequency * 2.2) /
            (frequency + 1.2 * (0.25 + (0.75 * doc.length) / average))
        );
      }, 0);
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((row) => row.candidate);
}

export function evidenceRank(
  ranked: string[],
  relevant: string[],
): number | null {
  const index = ranked.findIndex((id) => relevant.includes(id));
  return index === -1 ? null : index + 1;
}

export function parseDataset(value: unknown): Dataset {
  const dataset = value as Dataset;
  if (
    !dataset ||
    typeof dataset.model !== "string" ||
    !/^jev-\d+\.\d+\.\d+$/.test(dataset.model) ||
    !Array.isArray(dataset.candidates) ||
    !dataset.candidates.length ||
    !Array.isArray(dataset.queries) ||
    !dataset.queries.length ||
    dataset.queries.length > 6
  )
    throw new Error(
      "Dataset needs a pinned Jev version, candidates and 1..6 queries.",
    );
  const ids = new Set<string>();
  for (const c of dataset.candidates) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.id ||
      ids.has(c.id) ||
      typeof c.text !== "string" ||
      !c.text ||
      typeof c.source !== "string"
    )
      throw new Error("Invalid or duplicate candidate.");
    ids.add(c.id);
  }
  const queries = new Set<string>();
  for (const q of dataset.queries) {
    if (
      !q ||
      typeof q.id !== "string" ||
      !q.id ||
      queries.has(q.id) ||
      typeof q.text !== "string" ||
      !q.text ||
      !["calibration", "held-out"].includes(q.split) ||
      !Array.isArray(q.relevant) ||
      !q.relevant.length ||
      q.relevant.some((id) => !ids.has(id))
    )
      throw new Error("Invalid query or unknown evidence label.");
    queries.add(q.id);
  }
  return dataset;
}
