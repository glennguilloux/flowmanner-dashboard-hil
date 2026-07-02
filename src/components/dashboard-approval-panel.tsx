import Link from "next/link";
import { Shield, CheckCircle2 } from "lucide-react";
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
    requiresHumanApproval: boolean;
  };
  agent: { name: string } | null;
};

type Props = {
  needsReview: NeedsReviewTactic[];
  resolvedCount?: number;
};

export function DashboardApprovalPanel({ needsReview, resolvedCount = 0 }: Props) {
  // Gated items first — they're the most urgent (mandatory human gate).
  const sorted = [...needsReview].sort((a, b) => {
    const aGated = a.tactic.requiresHumanApproval ? 1 : 0;
    const bGated = b.tactic.requiresHumanApproval ? 1 : 0;
    return bGated - aGated;
  });
  const gatedCount = needsReview.filter((t) => t.tactic.requiresHumanApproval).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Awaiting approval ({needsReview.length})
          </h2>
          {gatedCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
              title={`${gatedCount} tactic${gatedCount === 1 ? "" : "s"} flagged as mandatory human gate`}
            >
              <Shield className="h-3 w-3" aria-hidden="true" />
              {gatedCount} gated
            </span>
          )}
          {resolvedCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
              title={`${resolvedCount} tactic${resolvedCount === 1 ? "" : "s"} already decided`}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {resolvedCount} resolved
            </span>
          )}
        </div>
        <Link href="/tactics?status=needs_review" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Review all
        </Link>
      </div>
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            ✓ Nothing pending. You are caught up.
          </p>
        ) : (
          sorted.slice(0, 5).map((t) => {
            const isGated = t.tactic.requiresHumanApproval;
            return (
              <Link
                key={t.tactic.id}
                href={`/tactics/${t.tactic.id}`}
                className={[
                  "block rounded-xl border p-4 transition-colors",
                  isGated
                    ? "border-indigo-200 bg-indigo-50/60 hover:border-indigo-300"
                    : "border-amber-100 bg-amber-50/50 hover:border-amber-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {t.tactic.title}
                      </p>
                      {isGated && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                          title="Mandatory human gate"
                          aria-label="Mandatory human gate"
                        >
                          <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                          Gated
                        </span>
                      )}
                    </div>
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
            );
          })
        )}
      </div>
    </section>
  );
}
