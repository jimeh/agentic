# Agent judge

`agent-judge evaluate` sends one explicit typed request to TypeSafe and returns
JSON for another program or agent to consume. It supports Noul, Choice, and
Score questions. It does not retrieve context, generate prose, or execute the
model's decisions.

## Evaluate selected context

Export `TYPESAFE_API_KEY` in the calling environment. A shell variable without
`export` is not visible to Bun or Mise tasks. Keep the key out of request files.

Create a request file, for example `/tmp/judge-request.json`:

```json
{
  "model": "jev-1.13.0",
  "state": {
    "query": "Find a reproduced cancellation defect.",
    "excerpt": "The test reproduced the cancellation error before the fix."
  },
  "questions": {
    "relevant": {
      "type": "noul",
      "instructions": "Does `excerpt` provide evidence relevant to `query`?"
    }
  }
}
```

From the repository:

```bash
mise run judge -- evaluate --request /tmp/judge-request.json
```

The normal agent-config installation links `agent-judge` into `~/.local/bin`.
The installed command accepts the same arguments. Installation is separate from
using the repository task; do not run the installer from a delivery worktree.

Use `--request -` for stdin. `--timeout` sets the network deadline in whole
seconds, from 1 through 300, defaulting to 30. Each invocation sends at most one
request to `https://api.typesafe.ai/v1/systemone`, without retries or redirects.
The CLI checks the input shape and caps it at 128 KiB. The service owns detailed
question validation and token limits. The byte cap is not a token or spending
limit. A model version or alias must be explicit in the request.

Success prints one JSON object with `kind`, `request_sha256`, `elapsed_ms`, and
`response`. The response preserves the service's model, typed answers,
probabilities, confidence where supplied, and usage. Missing usage counters
remain missing rather than becoming zero. Invalid or incomplete answers fail.

Errors print JSON on stderr. Exit codes are 0 for success, 1 for an error, 2 for
timeout, 130 for SIGINT, and 143 for SIGTERM. A timeout or interruption cannot
guarantee the service stopped processing or billing the request. HTTP errors
include their status but omit the service body, which might echo input.

`--artifact-dir /tmp/judge-run-001` creates a new directory with mode 0700 and
files with mode 0600. Its parent must already exist. The files are
`request.json` and either `result.json` or `error.json`. Existing directories
are rejected before calling the API. Artifacts contain the submitted context, so
keep them outside tracked directories. Inspect saved results locally without
another call; sending the saved request again is a new paid evaluation.
Authentication headers are never stored.

## Run a bounded history experiment

Prepare a local dataset containing only reviewed excerpts. The experiment does
not scan conversation directories or upload whole transcripts:

```json
{
  "model": "jev-1.13.0",
  "candidates": [
    {
      "id": "example",
      "text": "A cancellation defect was reproduced by a regression test.",
      "source": "/local/transcript.jsonl:42"
    }
  ],
  "queries": [
    {
      "id": "cancellation",
      "text": "Find evidence of a reproduced cancellation defect.",
      "relevant": ["example"],
      "split": "held-out"
    }
  ]
}
```

Freeze queries and known-evidence labels before model scoring. Reserve held-out
queries from prompt tuning. The runner records each split but does not perform
training or enforce how the dataset was authored.

```bash
# Local preview only; no API key needed and no network calls.
mise run judge:history-trial -- \
  --dataset /tmp/history-dataset.json --out /tmp/history-preview

# Explicitly send the selected excerpts. Use a separate new output directory.
mise run judge:history-trial -- \
  --dataset /tmp/history-dataset.json --out /tmp/history-run --run
```

The runner uses BM25 (k1=1.2, b=0.75) to select eight candidates per query and
scores each pair with a fixed Noul question. Labels, local source paths, and
candidate IDs are not sent to TypeSafe. Limits are six queries, 48 calls, four
concurrent calls, 30 seconds per call, and no retries. A preflight guard permits
at most 256,000 serialized request bytes including a 1,024-byte allowance per
call. That guard is a payload allowance, not a tokenizer or hard billing cap.
The first failed request stops new batches and aborts other in-flight requests.

Private artifacts preserve the dataset, exact plan, each request and result, and
a final `report.json`. The report includes known-evidence ranks before and
after, context character counts, elapsed time, actual input usage when
available, and a cost estimate using an explicitly recorded dated price. It does
not measure downstream agent tokens or completion time. A missing known target
can mean the retriever omitted it; the reranker cannot recover an absent
candidate. Labels may also omit other useful evidence. Inspect individual
results before drawing conclusions from aggregate ranks.

## Verification and API references

`mise run test:judge` runs offline tests with fake HTTP boundaries; it never
uses the real API key. The tests also run in `test:unit`. Typechecking and
formatting use the repository's ordinary tasks.

The [TypeSafe API reference](https://docs.typesafe.ai/api) defines the wire
format. The
[reranking cookbook](https://docs.typesafe.ai/cookbooks/rerank_typesafe)
describes pairwise relevance scoring. Consult
[models](https://docs.typesafe.ai/models) for current model limits and pricing
and the vendored `typesafe-ai` skill for question-design guidance. Probabilistic
judgments do not replace source inspection, tests, or user authorization.
