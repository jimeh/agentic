/** Test-only GraphQL responder that mimics the PR query the monitor issues. */

export type Connection = "checks" | "reviews" | "comments" | "threads";

export type FixtureState = {
  sha: string;
  /** Whether the `build` check run has completed successfully. */
  completed: boolean;
  /** Pages per connection; unspecified connections return one page. */
  pages: Partial<Record<Connection, number>>;
  /** Include reviews, comments, threads, and a second check on their pages. */
  detail: boolean;
};

export type Variables = {
  withChecks: boolean;
  checksAfter: string | null;
  withReviews: boolean;
  reviewsAfter: string | null;
  withComments: boolean;
  commentsAfter: string | null;
  withThreads: boolean;
  threadsAfter: string | null;
};

export function fixtureState(
  overrides: Partial<FixtureState> = {},
): FixtureState {
  return {
    sha: "a".repeat(40),
    completed: false,
    pages: {},
    detail: false,
    ...overrides,
  };
}

function pageNumber(cursor: string | null): number {
  return cursor ? Number(cursor.replace("page-", "")) : 1;
}

function page(
  state: FixtureState,
  name: Connection,
  cursor: string | null,
  nodes: (page: number) => unknown[],
) {
  const current = pageNumber(cursor);
  const total = state.pages[name] ?? 1;
  return {
    nodes: nodes(current),
    pageInfo: {
      hasNextPage: current < total,
      endCursor: current < total ? `page-${current + 1}` : null,
    },
  };
}

function author(login = "reviewer") {
  return { login };
}

export function respond(variables: Variables, state: FixtureState) {
  const sha = state.sha;
  const pullRequest: Record<string, unknown> = {
    url: "https://github.com/owner/repo/pull/1",
    headRefOid: sha,
    state: "OPEN",
    isDraft: false,
    reviewDecision: state.detail ? "APPROVED" : null,
    mergeStateStatus: "BLOCKED",
  };
  if (variables.withChecks) {
    pullRequest.commits = {
      nodes: [
        {
          commit: {
            statusCheckRollup: {
              contexts: page(state, "checks", variables.checksAfter, (n) =>
                n === 1
                  ? [
                      {
                        __typename: "CheckRun",
                        databaseId: 1,
                        name: "build",
                        status: state.completed ? "COMPLETED" : "IN_PROGRESS",
                        conclusion: state.completed ? "SUCCESS" : null,
                        permalink: "https://github.com/owner/repo/runs/1",
                      },
                      ...(state.detail
                        ? [
                            {
                              __typename: "StatusContext",
                              context: "external",
                              state: "FAILURE",
                              targetUrl: null,
                              createdAt: "2026-09-06T11:00:00Z",
                            },
                          ]
                        : []),
                    ]
                  : [
                      {
                        __typename: "CheckRun",
                        databaseId: 2,
                        name: "test",
                        status: "COMPLETED",
                        conclusion: "FAILURE",
                        permalink: "https://github.com/owner/repo/runs/2",
                      },
                      {
                        __typename: "StatusContext",
                        context: "external",
                        state: "SUCCESS",
                        targetUrl: "https://ci.example/2",
                        createdAt: "2026-09-06T12:00:00Z",
                      },
                    ],
              ),
            },
          },
        },
      ],
    };
  }
  if (variables.withReviews) {
    pullRequest.reviews = page(state, "reviews", variables.reviewsAfter, (n) =>
      state.detail
        ? [
            {
              databaseId: n,
              state: n === 1 ? "APPROVED" : "COMMENTED",
              body: "review body",
              updatedAt: "2026-09-06T12:00:00Z",
              url: `https://github.com/owner/repo/pull/1#pullrequestreview-${n}`,
              author: author(),
              commit: { oid: sha },
            },
            {
              databaseId: 100 + n,
              state: "PENDING",
              body: "draft review",
              updatedAt: "2026-09-06T12:00:00Z",
              url: `https://github.com/owner/repo/pull/1#pullrequestreview-${100 + n}`,
              author: author("me"),
              commit: { oid: sha },
            },
          ]
        : [],
    );
  }
  if (variables.withComments) {
    pullRequest.comments = page(
      state,
      "comments",
      variables.commentsAfter,
      (n) =>
        state.detail
          ? [
              {
                databaseId: n,
                body: "comment body",
                updatedAt: "2026-09-06T12:00:00Z",
                url: `https://github.com/owner/repo/pull/1#issuecomment-${n}`,
                author: n === 1 ? author() : null,
              },
            ]
          : [],
    );
  }
  if (variables.withThreads) {
    pullRequest.reviewThreads = page(
      state,
      "threads",
      variables.threadsAfter,
      (n) =>
        state.detail
          ? [
              {
                id: `thread${n}`,
                isResolved: n !== 1,
                isOutdated: true,
                path: "src/a.ts",
                line: null,
                comments: {
                  nodes: [
                    {
                      databaseId: 10 + n,
                      body: "inline body",
                      updatedAt: "2026-09-06T12:00:00Z",
                      url: `https://github.com/owner/repo/pull/1#discussion_r${10 + n}`,
                      author: author(),
                      commit: { oid: sha },
                    },
                  ],
                  pageInfo: { hasNextPage: false },
                },
              },
            ]
          : [],
    );
  }
  return { data: { repository: { pullRequest } } };
}
