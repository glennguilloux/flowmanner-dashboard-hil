import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { getTodaySummary, getWeekSummary } from "@/lib/usage";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export async function UsagePanel() {
  const [today, week] = await Promise.all([getTodaySummary(), getWeekSummary()]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            LLM Usage
          </h2>
        </div>
        <Link
          href="/usage"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Details
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Today */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Today</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatTokens(today.totalInput + today.totalOutput)}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {today.totalRequests} request{today.totalRequests === 1 ? "" : "s"}
          </p>
        </div>

        {/* This week */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">This week</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {formatTokens(week.totalInput + week.totalOutput)}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            {week.totalRequests} request{week.totalRequests === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </section>
  );
}
