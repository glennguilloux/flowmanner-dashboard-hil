import { getDecisionsPaginated } from "@/lib/decisions";
import { DecisionDetail } from "@/components/decision-detail";
import { Scale } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const { data: decisions, total } = await getDecisionsPaginated({
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
          Decision Log
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          All human decisions on agent tactics — approvals, rejections, and
          requests for more info.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              All Decisions
            </h2>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              {total}
            </span>
          </div>
        </div>

        {decisions.length === 0 ? (
          <div className="py-8 text-center">
            <Scale className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No decisions recorded yet. Approve or reject a tactic to see it
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {decisions.map((d) => (
              <DecisionDetail
                key={d.id}
                id={d.id}
                tacticId={d.tacticId}
                tacticTitle={d.tacticTitle}
                decision={d.decision}
                notes={d.notes}
                agentName={d.agentName}
                strategyTitle={d.strategyTitle}
                source={d.source}
                createdAt={d.createdAt.toISOString()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
