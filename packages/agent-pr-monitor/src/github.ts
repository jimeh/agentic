import { createHash } from "node:crypto";
import { Octokit } from "@octokit/core";
import type { Check, Feedback, Snapshot, Target, Thread } from "./model";

export class ObservationError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

const PAGE_SIZE = 100;
/** Bound on GraphQL requests per observation; each one pages every connection still open. */
const MAX_REQUESTS = 50;

/**
 * One query observes the whole PR. Connections are paged independently through
 * their `with*` flags, so follow-up requests only carry connections with more pages.
 */
const query = `query MonitorPullRequest(
  $owner: String!, $repo: String!, $number: Int!,
  $withChecks: Boolean!, $checksAfter: String,
  $withReviews: Boolean!, $reviewsAfter: String,
  $withComments: Boolean!, $commentsAfter: String,
  $withThreads: Boolean!, $threadsAfter: String
) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      url headRefOid state isDraft reviewDecision mergeStateStatus
      commits(last: 1) @include(if: $withChecks) {
        nodes { commit { statusCheckRollup { contexts(first: ${PAGE_SIZE}, after: $checksAfter) {
          nodes {
            __typename
            ... on CheckRun { databaseId name status conclusion permalink }
            ... on StatusContext { context state targetUrl createdAt }
          }
          pageInfo { hasNextPage endCursor }
        } } } }
      }
      reviews(first: ${PAGE_SIZE}, after: $reviewsAfter) @include(if: $withReviews) {
        nodes { databaseId state body updatedAt url author { login } commit { oid } }
        pageInfo { hasNextPage endCursor }
      }
      comments(first: ${PAGE_SIZE}, after: $commentsAfter) @include(if: $withComments) {
        nodes { databaseId body updatedAt url author { login } }
        pageInfo { hasNextPage endCursor }
      }
      reviewThreads(first: ${PAGE_SIZE}, after: $threadsAfter) @include(if: $withThreads) {
        nodes {
          id isResolved isOutdated path line
          comments(first: ${PAGE_SIZE}) {
            nodes { databaseId body updatedAt url author { login } commit { oid } }
            pageInfo { hasNextPage }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

type Page<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};
type Actor = { login: string } | null;
type CheckNode =
  | {
      __typename: "CheckRun";
      databaseId: number | null;
      name: string;
      status: string;
      conclusion: string | null;
      permalink: string;
    }
  | {
      __typename: "StatusContext";
      context: string;
      state: string;
      targetUrl: string | null;
      createdAt: string;
    };
type CommentNode = {
  databaseId: number | null;
  body: string;
  updatedAt: string;
  url: string;
  author: Actor;
};
type ReviewCommentNode = CommentNode & { commit: { oid: string } | null };
type ReviewNode = ReviewCommentNode & { state: string };
type ThreadNode = {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  path: string;
  line: number | null;
  comments: { nodes: ReviewCommentNode[]; pageInfo: { hasNextPage: boolean } };
};
type PullRequestNode = {
  url: string;
  headRefOid: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  reviewDecision: string | null;
  mergeStateStatus: string;
  commits?: {
    nodes: {
      commit: { statusCheckRollup: { contexts: Page<CheckNode> } | null };
    }[];
  };
  reviews?: Page<ReviewNode>;
  comments?: Page<CommentNode>;
  reviewThreads?: Page<ThreadNode>;
};
export type QueryResult = {
  repository: { pullRequest: PullRequestNode | null } | null;
};

type Connection = "checks" | "reviews" | "comments" | "threads";
const connections: Connection[] = ["checks", "reviews", "comments", "threads"];

function bodyHash(body: string | null | undefined): string {
  return createHash("sha256")
    .update(body ?? "")
    .digest("hex");
}

function runState(status: string, conclusion: string | null): Check["state"] {
  if (status !== "COMPLETED" || conclusion === null) return "pending";
  return ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(conclusion)
    ? "passed"
    : "failed";
}

function contextState(state: string): Check["state"] {
  if (state === "SUCCESS") return "passed";
  return ["FAILURE", "ERROR"].includes(state) ? "failed" : "pending";
}

const permanentGraphqlErrors = [
  "FORBIDDEN",
  "NOT_FOUND",
  "INSUFFICIENT_SCOPES",
];

function apiError(error: unknown): ObservationError {
  if (error instanceof ObservationError) return error;
  const failure = error as {
    status?: number;
    message?: string;
    headers?: Record<string, string>;
    response?: { headers?: Record<string, string> };
    errors?: { type?: string }[];
  };
  const status = failure?.status;
  const headers = failure?.response?.headers ?? failure?.headers ?? {};
  const types = new Set((failure?.errors ?? []).map((item) => item.type));
  const retryAfter = Number(headers["retry-after"]);
  const reset = Number(headers["x-ratelimit-reset"]);
  if (
    status === 429 ||
    (status === 403 &&
      (headers["retry-after"] || headers["x-ratelimit-remaining"] === "0")) ||
    types.has("RATE_LIMITED")
  ) {
    const delay =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Number.isFinite(reset) && reset > 0
          ? reset * 1000 - Date.now()
          : 60_000;
    return new ObservationError(
      "GitHub rate limit reached",
      Math.max(1000, delay),
    );
  }
  if (failure?.errors) {
    return permanentGraphqlErrors.some((type) => types.has(type))
      ? new ObservationError(
          "GitHub rejected the query; check the target and token permissions",
        )
      : new ObservationError("GitHub GraphQL query failed", 1000);
  }
  if (status === undefined) {
    // Not an HTTP failure: most likely an unexpected response shape, so retrying cannot help.
    return new ObservationError(
      `Unexpected failure while observing GitHub: ${failure?.message ?? "unknown error"}`,
    );
  }
  if (status >= 500)
    return new ObservationError(
      "GitHub request failed; network or server unavailable",
      1000,
    );
  return new ObservationError(
    `GitHub request failed (HTTP ${status}); check the target and token permissions`,
  );
}

export function createClient(
  target: Target,
  token: string,
  fetchImpl?: typeof fetch,
): Octokit {
  return new Octokit({
    auth: token,
    // Octokit rewrites the GHES REST base to /api/graphql for GraphQL requests.
    baseUrl:
      target.host === "github.com"
        ? "https://api.github.com"
        : `https://${target.host}/api/v3`,
    userAgent: "agent-pr-monitor",
    ...(fetchImpl ? { request: { fetch: fetchImpl } } : {}),
    // Request objects contain credentials. The CLI emits its own bounded errors.
    log: { debug() {}, info() {}, warn() {}, error() {} },
  });
}

export type ObserveOptions = {
  signal?: AbortSignal;
  requestTimeoutMs?: number;
};

async function request(
  client: Octokit,
  variables: Record<string, unknown>,
  options: ObserveOptions,
): Promise<QueryResult> {
  const timer = AbortSignal.timeout(options.requestTimeoutMs ?? 30_000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timer])
    : timer;
  try {
    return await client.graphql<QueryResult>(query, {
      ...variables,
      request: { signal },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timer.aborted)
      throw new ObservationError("GitHub request timed out", 1000);
    throw apiError(error);
  }
}

/** Fetch a complete observation of one head; never return a partial one. */
export async function observe(
  client: Octokit,
  target: Target,
  options: ObserveOptions = {},
): Promise<Snapshot> {
  const wanted: Record<Connection, boolean> = {
    checks: true,
    reviews: true,
    comments: true,
    threads: true,
  };
  const cursors: Record<Connection, string | null> = {
    checks: null,
    reviews: null,
    comments: null,
    threads: null,
  };
  const checkNodes: CheckNode[] = [];
  const reviewNodes: ReviewNode[] = [];
  const commentNodes: CommentNode[] = [];
  const threadNodes: ThreadNode[] = [];
  let pr: PullRequestNode | null = null;
  let requests = 0;

  while (connections.some((name) => wanted[name])) {
    if (++requests > MAX_REQUESTS)
      throw new ObservationError(
        "PR has more pages of checks, feedback, or threads than the monitor supports",
      );
    const page = await request(
      client,
      {
        owner: target.owner,
        repo: target.repo,
        number: target.number,
        withChecks: wanted.checks,
        checksAfter: cursors.checks,
        withReviews: wanted.reviews,
        reviewsAfter: cursors.reviews,
        withComments: wanted.comments,
        commentsAfter: cursors.comments,
        withThreads: wanted.threads,
        threadsAfter: cursors.threads,
      },
      options,
    );
    const node = page.repository?.pullRequest;
    if (!node)
      throw new ObservationError(
        "PR unavailable; check the target and token permissions",
      );
    if (pr && node.headRefOid !== pr.headRefOid)
      throw new ObservationError("PR head changed during observation", 1000);
    pr ??= node;

    const pages: Partial<Record<Connection, Page<unknown> | undefined>> = {
      checks: node.commits?.nodes[0]?.commit.statusCheckRollup?.contexts ?? {
        nodes: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
      reviews: node.reviews,
      comments: node.comments,
      threads: node.reviewThreads,
    };
    const sinks: Record<Connection, unknown[]> = {
      checks: checkNodes,
      reviews: reviewNodes,
      comments: commentNodes,
      threads: threadNodes,
    };
    for (const name of connections) {
      if (!wanted[name]) continue;
      const connection = pages[name];
      if (!connection)
        throw new ObservationError(
          `GitHub omitted ${name} from the query response`,
        );
      sinks[name].push(...connection.nodes);
      const { hasNextPage, endCursor } = connection.pageInfo;
      if (hasNextPage && (!endCursor || endCursor === cursors[name]))
        throw new ObservationError(
          `GitHub returned an invalid ${name} pagination cursor`,
        );
      wanted[name] = hasNextPage;
      cursors[name] = endCursor;
    }
  }
  if (!pr) throw new ObservationError("PR unavailable");

  // The rollup can repeat a status context; keep the newest per context.
  const contexts = new Map<
    string,
    Extract<CheckNode, { __typename: "StatusContext" }>
  >();
  const runs: Check[] = [];
  for (const item of checkNodes) {
    if (item.__typename === "CheckRun") {
      runs.push({
        id: `check:${item.databaseId ?? item.name}`,
        name: item.name,
        state: runState(item.status, item.conclusion),
        conclusion: item.conclusion?.toLowerCase() ?? null,
        url: item.permalink,
      });
      continue;
    }
    const previous = contexts.get(item.context);
    if (!previous || item.createdAt > previous.createdAt)
      contexts.set(item.context, item);
  }
  const checks: Check[] = [
    ...runs,
    ...[...contexts.values()].map((status): Check => ({
      id: `status:${status.context}`,
      name: status.context,
      state: contextState(status.state),
      conclusion: status.state.toLowerCase(),
      url: status.targetUrl,
    })),
  ];

  const truncated = threadNodes.find(
    (thread) => thread.comments.pageInfo.hasNextPage,
  );
  if (truncated)
    throw new ObservationError(
      `Review thread ${truncated.id} has more comments than the monitor supports`,
    );
  const feedback: Feedback[] = [
    ...reviewNodes
      .filter((review) => review.state !== "PENDING")
      .map((review): Feedback => ({
        id: `review:${review.databaseId ?? review.url}`,
        kind: "review",
        author: review.author?.login ?? "deleted",
        url: review.url,
        updatedAt: review.updatedAt,
        bodyHash: bodyHash(review.body),
        commitSha: review.commit?.oid ?? null,
        reviewState: review.state,
      })),
    ...commentNodes.map((comment): Feedback => ({
      id: `comment:${comment.databaseId ?? comment.url}`,
      kind: "comment",
      author: comment.author?.login ?? "deleted",
      url: comment.url,
      updatedAt: comment.updatedAt,
      bodyHash: bodyHash(comment.body),
      commitSha: null,
      reviewState: null,
    })),
    ...threadNodes.flatMap((thread) =>
      thread.comments.nodes.map((comment): Feedback => ({
        id: `inline:${comment.databaseId ?? comment.url}`,
        kind: "inline_comment",
        author: comment.author?.login ?? "deleted",
        url: comment.url,
        updatedAt: comment.updatedAt,
        bodyHash: bodyHash(comment.body),
        commitSha: comment.commit?.oid ?? null,
        reviewState: null,
      })),
    ),
  ];
  const threads: Thread[] = threadNodes.map((thread) => ({
    id: thread.id,
    resolved: thread.isResolved,
    outdated: thread.isOutdated,
    path: thread.path,
    line: thread.line,
    url: thread.comments.nodes[0]?.url ?? null,
  }));
  return {
    observedAt: new Date().toISOString(),
    url: pr.url,
    headSha: pr.headRefOid,
    state:
      pr.state === "MERGED"
        ? "merged"
        : pr.state === "CLOSED"
          ? "closed"
          : "open",
    draft: pr.isDraft,
    reviewDecision: pr.reviewDecision,
    mergeStateStatus: pr.mergeStateStatus,
    checks,
    feedback,
    threads,
  };
}
