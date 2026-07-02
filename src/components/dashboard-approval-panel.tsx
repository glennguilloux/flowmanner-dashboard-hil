import Link from "next/link";
import { StatusBadge, RiskBadge } from "@/components/status-badge";

type NeedsReviewTactic = {
  tactic: {
    id: string;
    title: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    riskLevel: "low" | "medium" | "high";
    status: string;
  };
  agent: { name: string } | null;
};

type Props = {
  needsReview: NeedsReviewTactic[];
};

export function DashboardApprovalPanel({ needsReview }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Awaiting approval ({needsReview.length})
        </h2>
        <Link href="/tactics?status=needs_review" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Review all
        </Link>
      </div>
      <div className="space-y-3">
        {needsReview.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            ✓ Nothing pending. You are caught up.
          </p>
        ) : (
          needsReview.slice(0, 5).map((t) => (
            <Link
              key={t.tactic.id}
              href={`/tactics/${t.tactic.id}`}
              className="block rounded-xl border border-amber-100 bg-amber-50/50 p-4 transition-colors hover:border-amber-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {t.tactic.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t.tactic.source === "pr"
                        ? `PR #${t.tactic.sourceId}`
                        : t.tactic.source === "inbox"
                          ? "inbox"
                          : t.agent?.name ?? "Agent"}{" "}
                      · {t.tactic.confidence}%
                    </span>
                    <RiskBadge value={t.tactic.riskLevel} />
                  </div>
                </div>
                <StatusBadge status={t.tactic.status} kind="tactic" />
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
