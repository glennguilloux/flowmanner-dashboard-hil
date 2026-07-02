import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { CiRollup } from "@/lib/ci";

type PrTactic = {
  id: string;
  title: string;
  sourceId: string;
  confidence: number;
  riskLevel: string;
  status: string;
  ci: CiRollup;
  createdAt: Date;
};

type Props = {
  prTactics: PrTactic[];
  lastSyncedAt: string | null;
};

export function DashboardPrsPanel({ prTactics, lastSyncedAt }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Pull Requests ({prTactics.length})
        </h2>
        <Link href="/prs" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {prTactics.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500">
            {lastSyncedAt
              ? <>✓ No open PRs (last synced {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })})</>
              : "No PRs synced yet. Click Sync PRs to pull open PRs from GitHub."}
          </p>
        )}
        {prTactics.map((pr) => (
          <Link key={pr.id} href={`/tactics/${pr.id}`} className="block rounded-xl border p-4 transition-colors hover:shadow-md">
            <div className="mb-2 flex items-center gap-1.5">
              {pr.ci.state === "failing" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                  <XCircle className="h-3 w-3" /> {pr.ci.failing} failing
                </span>
              )}
              {pr.ci.state === "passing" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> CI passing
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-3">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">{pr.title}</p>
              <StatusBadge status={pr.status} kind="tactic" />
            </div>
            {pr.ci.state === "failing" && pr.ci.checks.filter((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR" || c.conclusion === "CANCELLED" || c.conclusion === "TIMED_OUT").length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {pr.ci.checks
                  .filter((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR" || c.conclusion === "CANCELLED" || c.conclusion === "TIMED_OUT")
                  .slice(0, 4)
                  .map((c, i) => (
                    <span key={i} className="rounded bg-rose-50 px-1.5 py-0.5 text-xs text-rose-600">{c.name}</span>
                  ))}
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {pr.sourceId} ·{" "}
              <time dateTime={new Date(pr.createdAt).toISOString()} title={new Date(pr.createdAt).toLocaleString()}>
                {formatDistanceToNow(new Date(pr.createdAt), { addSuffix: true })}
              </time>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
