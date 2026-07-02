import Link from "next/link";
import { getStrategies } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function StrategiesPage() {
  const strategies = await getStrategies();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">Strategies</h1>
          <p className="text-slate-600 dark:text-slate-400">
            High-level goals, rules, and human-gate triggers.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {strategies.map((strategy) => (
          <Link
            key={strategy.id}
            href={`/strategies/${strategy.id}`}
            className="group rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700">
                {strategy.title}
              </h2>
              <StatusBadge status={strategy.status} kind="strategy" />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
              {strategy.goal}
            </p>
            {strategy.humanGateTriggers && (
              <div className="mt-4 flex flex-wrap gap-2">
                {strategy.humanGateTriggers.split(",").map((trigger, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-600"
                  >
                    {trigger.trim()}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
        {strategies.length === 0 && (
          <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
            No strategies yet — load demo data from the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}