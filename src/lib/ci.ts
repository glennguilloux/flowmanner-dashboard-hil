// Shared CI check types and rollup computation. Used by the dashboard page,
// the tactic detail page, the PR sync route, and the merge route. Single
// source of truth for "is CI passing/failing/pending?" — no duplicate logic.

export type CiCheck = {
  name: string;
  status: string;
  conclusion: string | null;
  url: string | null;
  startedAt: string | null;
  completedAt: string | null;
  workflow: string | null;
};

export type CiState = "passing" | "failing" | "pending" | "none";

export type CiRollup = {
  state: CiState;
  failing: number;
  passing: number;
  pending: number;
  checks: CiCheck[];
};

/** Failing conclusion values from GitHub statusCheckRollup. */
const FAILING_CONCLUSIONS = new Set([
  "FAILURE",
  "ERROR",
  "CANCELLED",
  "TIMED_OUT",
]);

/** Pending status values from GitHub statusCheckRollup. */
const PENDING_STATUSES = new Set([
  "IN_PROGRESS",
  "QUEUED",
  "PENDING",
  "WAITING",
]);

/** Passing conclusion values from GitHub statusCheckRollup. */
const PASSING_CONCLUSIONS = new Set(["SUCCESS", "SKIPPED", "NEUTRAL"]);

/**
 * Compute a CiRollup from the raw ciChecks JSONB stored on a tactic row.
 * Handles both the raw GitHub statusCheckRollup format (with `detailsUrl`,
 * `workflowName`) and the normalized CiCheck format (with `url`, `workflow`).
 *
 * Returns a zero-checks rollup for null/undefined/non-array input.
 */
export function computeCiRollup(rawChecks: unknown): CiRollup {
  if (!Array.isArray(rawChecks) || rawChecks.length === 0) {
    return { state: "none", failing: 0, passing: 0, pending: 0, checks: [] };
  }

  const checks: CiCheck[] = rawChecks.map((r: Record<string, unknown>) => ({
    name: (r.name as string) ?? "unknown",
    status: (r.status as string) ?? "COMPLETED",
    conclusion: (r.conclusion as string | null) ?? null,
    url: ((r.url ?? r.detailsUrl) as string | null) ?? null,
    startedAt: (r.startedAt as string | null) ?? null,
    completedAt: (r.completedAt as string | null) ?? null,
    workflow: ((r.workflow ?? r.workflowName) as string | null) ?? null,
  }));

  let failing = 0;
  let passing = 0;
  let pending = 0;

  for (const c of checks) {
    if (PENDING_STATUSES.has(c.status)) {
      pending++;
    } else if (c.conclusion && FAILING_CONCLUSIONS.has(c.conclusion)) {
      failing++;
    } else if (c.conclusion && PASSING_CONCLUSIONS.has(c.conclusion)) {
      passing++;
    }
  }

  let state: CiState;
  if (failing > 0) state = "failing";
  else if (pending > 0) state = "pending";
  else if (passing > 0) state = "passing";
  else state = "none";

  return { state, failing, passing, pending, checks };
}
