// GitHub CLI wrapper. `gh` is already authed via the user's keyring
// (`gh auth status` → logged in as glennguilloux). We shell out rather than
// import @octokit/* because gh handles auth + Git protocol quirks for us.
//
// All functions throw on non-zero exit; callers wrap as needed.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { computeCiRollup } from "@/lib/ci";
import type { CiCheck, CiRollup, CiState } from "@/lib/ci";

const execFileP = promisify(execFile);

const REPO = process.env.GH_REPO ?? "glennguilloux/flowmanner";

// Re-export CI types so existing callers (e.g. tactic detail page) can
// import { CiCheck } from "@/lib/github" without breaking.
export type { CiCheck, CiRollup, CiState };

export type GhPr = {
  number: number;
  title: string;
  authorLogin: string;
  authorName: string;
  url: string;
  isDraft: boolean;
  reviewDecision: string;
  createdAt: string;
  headRefName: string;
  baseRefName: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergeable: string;
  ci: CiRollup;
  body: string;
};

export async function ghJson<T>(args: string[]): Promise<T> {
  const { stdout } = await execFileP("gh", args, {
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

export async function ghText(args: string[]): Promise<string> {
  const { stdout } = await execFileP("gh", args, { maxBuffer: 8 * 1024 * 1024 });
  return stdout.trim();
}

export async function getOpenPrs(): Promise<GhPr[]> {
  // Single big JSON call. Includes checks + review decision so we don't have
  // to do N+1 `gh pr view` calls.
  const raw = await ghJson<RawPr[]>([
    "pr", "list",
    "--repo", REPO,
    "--state", "open",
    "--limit", "50",
    "--json",
    "number,title,author,url,isDraft,reviewDecision,createdAt,headRefName,baseRefName,additions,deletions,changedFiles,mergeable,statusCheckRollup,body",
  ]);
  return raw.map(toGhPr);
}

type RawPr = {
  number: number;
  title: string;
  author: { login: string; name?: string };
  url: string;
  isDraft: boolean;
  reviewDecision: string;
  createdAt: string;
  headRefName: string;
  baseRefName: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergeable: string;
  statusCheckRollup: Array<{
    __typename: string;
    name: string;
    status: string;
    conclusion: string | null;
    detailsUrl: string | null;
    startedAt: string | null;
    completedAt: string | null;
    workflowName?: string;
  }> | null;
  body: string;
};

function toGhPr(raw: RawPr): GhPr {
  const ci = computeCiRollup(raw.statusCheckRollup);
  return {
    number: raw.number,
    title: raw.title,
    authorLogin: raw.author?.login ?? "unknown",
    authorName: raw.author?.name ?? raw.author?.login ?? "unknown",
    url: raw.url,
    isDraft: raw.isDraft,
    reviewDecision: raw.reviewDecision ?? "",
    createdAt: raw.createdAt,
    headRefName: raw.headRefName,
    baseRefName: raw.baseRefName,
    additions: raw.additions,
    deletions: raw.deletions,
    changedFiles: raw.changedFiles,
    mergeable: raw.mergeable ?? "UNKNOWN",
    ci,
    body: (raw.body ?? "").slice(0, 2000),
  };
}

// ---- Action wrappers (these are what the approve route calls) ----

export async function prApprove(prNumber: number, body?: string): Promise<void> {
  const args = [
    "pr", "review", String(prNumber),
    "--repo", REPO,
    "--approve",
  ];
  if (body) {
    args.push("--body", body);
  }
  await execFileP("gh", args);
}

export async function prRequestChanges(
  prNumber: number,
  body: string,
): Promise<void> {
  await execFileP("gh", [
    "pr", "review", String(prNumber),
    "--repo", REPO,
    "--request-changes",
    "--body", body,
  ]);
}

export async function prComment(
  prNumber: number,
  body: string,
): Promise<void> {
  await execFileP("gh", [
    "pr", "comment", String(prNumber),
    "--repo", REPO,
    "--body", body,
  ]);
}

export async function prMerge(prNumber: number): Promise<string> {
  // --squash keeps history linear, --delete-branch cleans up after merge.
  // Caller is responsible for the CI gate; this just executes.
  const { stdout } = await execFileP("gh", [
    "pr", "merge", String(prNumber),
    "--repo", REPO,
    "--squash",
    "--delete-branch",
  ]);
  return stdout.trim();
}

export function prUrl(prNumber: number): string {
  return `https://github.com/${REPO}/pull/${prNumber}`;
}

// ---- Tactic upsert data ----

export function prTacticValues(pr: GhPr, strategyId: string) {
  // Heuristic risk from diff size + draft + review state.
  let risk: "low" | "medium" | "high" = "low";
  if (pr.changedFiles >= 10 || Math.abs(pr.deletions) >= 500) risk = "medium";
  if (pr.changedFiles >= 30 || Math.abs(pr.deletions) >= 2000) risk = "high";
  // Confidence is a placeholder until phase 4 reviewer scores from the diff.
  // For now, derive from CI: passing = high, pending = medium, failing = low.
  let confidence = 70;
  if (pr.ci.state === "passing") confidence = 88;
  if (pr.ci.state === "failing") confidence = 35;
  if (pr.ci.state === "pending") confidence = 60;
  if (pr.isDraft) confidence = Math.min(confidence, 60);

  // Initial tactic status: gated if CI failing or no review.
  let status: "proposed" | "needs_review" | "approved" = "proposed";
  let requiresHumanApproval = false;
  if (pr.ci.state === "failing") {
    status = "needs_review";
    requiresHumanApproval = true;
  } else if (pr.ci.state === "pending") {
    status = "needs_review";
    requiresHumanApproval = true;
  } else if (pr.reviewDecision === "REVIEW_REQUIRED" || pr.reviewDecision === "") {
    status = "needs_review";
    requiresHumanApproval = true;
  } else if (pr.reviewDecision === "APPROVED") {
    status = "approved";
  } else if (pr.reviewDecision === "CHANGES_REQUESTED") {
    status = "needs_review";
    requiresHumanApproval = true;
  }

  return {
    strategyId,
    title: `PR #${pr.number}: ${pr.title}`,
    description: pr.body || "(no PR description)",
    steps: pr.ci.checks.map((c: CiCheck) => `[${c.conclusion ?? c.status}] ${c.name}`),
    sources: [
      { title: `Open PR #${pr.number} on GitHub`, url: pr.url },
    ],
    confidence,
    riskLevel: risk as "low" | "medium" | "high",
    status,
    requiresHumanApproval,
    source: "pr" as const,
    sourceId: String(pr.number),
    ciChecks: pr.ci.checks,
    prMergeable: pr.mergeable,
  };
}
