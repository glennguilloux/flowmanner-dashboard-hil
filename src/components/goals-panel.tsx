import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { GoalProgressBar } from "@/components/goal-progress-bar";
import type { goals } from "@/db/schema";

type GoalRow = {
  goal: typeof goals.$inferSelect;
  projectCount: number;
};

type Props = {
  goals: GoalRow[];
};

export function GoalsPanel({ goals: goalRows }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Goals
          </h2>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            {goalRows.length} active
          </span>
        </div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {goalRows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No active goals yet.
          </p>
        ) : (
          goalRows.slice(0, 3).map(({ goal, projectCount }) => (
            <Link
              key={goal.id}
              href={`/goals/${goal.id}`}
              className="block rounded-xl border border-slate-100 dark:border-slate-800 p-4 transition-colors hover:border-indigo-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {goal.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="capitalize">{goal.type}</span>
                    {goal.category !== "general" && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{goal.category}</span>
                      </>
                    )}
                    {projectCount > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {projectCount} project{projectCount === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {goal.timeframe && (
                  <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                    {goal.timeframe}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <GoalProgressBar progress={goal.progress} />
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
