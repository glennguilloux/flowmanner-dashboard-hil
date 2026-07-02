import Link from "next/link";
import type { tactics, agents } from "@/db/schema";
import { AlertTriangle, Bot, CheckCircle2, Clock } from "lucide-react";
import { ConfidenceBadge, RiskBadge } from "@/components/status-badge";

type Tactic = typeof tactics.$inferSelect;
type Agent = typeof agents.$inferSelect | null;

export function TacticCard({
  tactic,
  agent,
}: {
  tactic: Tactic;
  agent: Agent;
}) {
  const needsAttention = tactic.status === "needs_review";

  return (
    <Link
      href={`/tactics/${tactic.id}`}
      className={[
        "block rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md",
        needsAttention
          ? "border-amber-200 bg-amber-50/40 hover:border-amber-300"
          : "border-slate-200 bg-white dark:bg-slate-900 hover:border-indigo-300",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{tactic.title}</h3>
        <StatusIcon status={tactic.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
        {tactic.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-700">
          <Bot className="h-3 w-3" /> {agent?.name ?? "Agent"}
        </span>
        <ConfidenceBadge value={tactic.confidence} />
        <RiskBadge value={tactic.riskLevel} />
        {tactic.requiresHumanApproval && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 font-medium text-indigo-700">
            <AlertTriangle className="h-3 w-3" /> Human gate
          </span>
        )}
        {tactic.source === "pr" && (
          <span className="rounded-full bg-sky-100 px-2 py-1 font-medium text-sky-700">
            PR #{tactic.sourceId ?? "?"}
          </span>
        )}
        {tactic.source === "inbox" && (
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 font-medium text-slate-700">
            inbox
          </span>
        )}
      </div>
    </Link>
  );
}

function StatusIcon({ status }: { status: Tactic["status"] }) {
  if (status === "approved" || status === "completed") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }
  if (status === "needs_review") {
    return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  }
  if (status === "rejected") {
    return <AlertTriangle className="h-5 w-5 text-rose-600" />;
  }
  return <Clock className="h-5 w-5 text-slate-400" />;
}