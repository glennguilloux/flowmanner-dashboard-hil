import Link from "next/link";
import { getGoals } from "@/lib/goals";
import { GoalProgressBar } from "@/components/goal-progress-bar";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goalRows = await getGoals();

  const active = goalRows.filter((r) => r.goal.status === "active");
  const completed = goalRows.filter((r) => r.goal.status === "completed");
  const archived = goalRows.filter((r) => r.goal.status === "archived");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
          Goals
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Strategic objectives above strategies and tactics.
        </p>
      </div>

      {goalRows.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
          <Target className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No goals yet — load demo data from the dashboard.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <GoalSection title="Active" goals={active} />
      )}

      {completed.length > 0 && (
        <GoalSection title="Completed" goals={completed} />
      )}

      {archived.length > 0 && (
        <GoalSection title="Archived" goals={archived} />
      )}
    </div>
  );
}

function GoalSection({
  title,
  goals: rows,
}: {
  title: string;
  goals: Array<{
    goal: {
      id: string;
      title: string;
      description: string;
      type: string;
      category: string;
      status: string;
      timeframe: string | null;
      progress: number;
    };
    projectCount: number;
  }>;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title} ({rows.length})
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ goal, projectCount }) => (
          <Link
            key={goal.id}
            href={`/goals/${goal.id}`}
            className="group rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-700">
                {goal.title}
              </h3>
              {goal.timeframe && (
                <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {goal.timeframe}
                </span>
              )}
            </div>
            {goal.description && (
              <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                {goal.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
            <div className="mt-4">
              <GoalProgressBar progress={goal.progress} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
