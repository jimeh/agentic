import type { Octokit } from "@octokit/core";
import { observe, type GoalMetadata } from "./github";
import type { GoalObservation, RequiredCheck } from "./goals";
import type { Target } from "./model";

/** Combine classic branch protection and active rulesets; partial metadata never proves success. */
export async function observeGoal(
  client: Octokit,
  target: Target,
  required: boolean,
  signal: AbortSignal,
): Promise<GoalObservation> {
  let metadata: GoalMetadata | undefined;
  const snapshot = await observe(client, target, {
    signal,
    captureGoal: (m) => {
      metadata = m;
    },
  });
  const result: GoalObservation = {
    snapshot,
    reviewSubmittedAt: metadata?.reviewSubmittedAt ?? {},
    mergeable: metadata?.mergeable ?? "UNKNOWN",
    requiredChecks: null,
  };
  if (!required || !metadata?.baseRefName || metadata.classicChecks === null)
    return result;
  const checks: RequiredCheck[] = [...metadata.classicChecks];
  try {
    for (let page = 1; page <= 50; page++) {
      const response = await client.request(
        "GET /repos/{owner}/{repo}/rules/branches/{branch}",
        {
          owner: target.owner,
          repo: target.repo,
          branch: metadata.baseRefName,
          per_page: 100,
          page,
          request: {
            signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
          },
        },
      );
      if (!Array.isArray(response.data)) return result;
      for (const rule of response.data) {
        // Required workflow rules do not expose their runtime check names here.
        if (rule.type === "workflows") return result;
        if (rule.type !== "required_status_checks") continue;
        if (!rule.parameters?.required_status_checks) return result;
        for (const c of rule.parameters.required_status_checks) {
          if (typeof c.context !== "string") return result;
          checks.push({ name: c.context, appId: c.integration_id ?? null });
        }
      }
      if (!response.headers.link?.includes('rel="next"')) {
        result.requiredChecks = [
          ...new Map(checks.map((c) => [JSON.stringify(c), c])).values(),
        ];
        return result;
      }
    }
  } catch {
    if (signal.aborted) throw signal.reason;
    // Permissions, unsupported enterprise APIs and incomplete rules remain unknown.
  }
  return result;
}
