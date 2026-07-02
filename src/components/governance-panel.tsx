import Link from "next/link";
import { getTactics } from "@/lib/data";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { RiskBadge } from "@/components/status-badge";

export async function GovernancePanel() {
  const [gated, resolved] = await Promise.all([
    getTactics({ status: "needs_review", requiresHumanApproval: true }),
    getTactics({ excludeStatus: "needs_review", humanDecisionIsNotNull: true }),
  ]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Human Gates
          </h2>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {gated.length} pending · {resolved.length} resolved
        </span>
      </div>

      {gated.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          All gates resolved. Nothing needs your approval.
        </div>
      ) : (
        <div className="space-y-2">
          {gated.map((t) => (
            <Link
              key={t.tactic.id}
              href={`/tactics/${t.tactic.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 transition-colors hover:border-amber-300"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t.tactic.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t.tactic.source === "pr"
                      ? `PR #${t.tactic.sourceId}`
                      : t.tactic.source === "inbox"
                        ? "inbox interrupt"
                        : "simulated"}
                    {" · "}
                    {t.tactic.confidence}% confidence
                  </span>
                  <RiskBadge value={t.tactic.riskLevel} />
                </div>
              </div>
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
