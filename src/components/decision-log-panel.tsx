import Link from "next/link";
import { Scale, ArrowRight, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DecisionLogEntry } from "@/lib/decisions";

type Props = {
  decisions: DecisionLogEntry[];
};

function DecisionIcon({ decision }: { decision: string }) {
  if (decision === "approve")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (decision === "reject")
    return <XCircle className="h-4 w-4 text-rose-500" />;
  return <HelpCircle className="h-4 w-4 text-amber-500" />;
}

function DecisionLabel({ decision }: { decision: string }) {
  if (decision === "approve") return "Approved";
  if (decision === "reject") return "Rejected";
  return "More info requested";
}

export function DecisionLogPanel({ decisions }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Decisions
          </h2>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            {decisions.length}
          </span>
        </div>
        <Link
          href="/decisions"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {decisions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No decisions recorded yet.
          </p>
        ) : (
          decisions.slice(0, 5).map((d) => (
            <Link
              key={d.id}
              href={`/tactics/${d.tacticId}`}
              className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:border-indigo-200"
            >
              <DecisionIcon decision={d.decision} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {d.tacticTitle}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-medium">
                    <DecisionLabel decision={d.decision} />
                  </span>
                  {d.agentName && (
                    <>
                      <span>·</span>
                      <span>{d.agentName}</span>
                    </>
                  )}
                  <span>·</span>
                  <span suppressHydrationWarning>
                    {formatDistanceToNow(new Date(d.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
