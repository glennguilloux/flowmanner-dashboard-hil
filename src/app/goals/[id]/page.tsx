import Link from "next/link";
import { notFound } from "next/navigation";
import { getGoalById } from "@/lib/goals";
import { GoalProgressBar } from "@/components/goal-progress-bar";
import { Target, FolderKanban, Layers, ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link href="/goals" className="hover:text-indigo-600">
            Goals
          </Link>
          <span>/</span>
          <span className="capitalize">{goal.status}</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
              {goal.title}
            </h1>
            {goal.description && (
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium capitalize text-slate-700 dark:text-slate-300">
              {goal.type}
            </span>
            {goal.category !== "general" && (
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium capitalize text-indigo-700">
                {goal.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Progress
          </span>
          {goal.timeframe && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {goal.timeframe}
            </span>
          )}
        </div>
        <div className="mt-3">
          <GoalProgressBar progress={goal.progress} />
        </div>
      </div>

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Milestones ({goal.milestones.length})
            </h2>
          </div>
          <div className="space-y-3">
            {goal.milestones.map((m) => (
              <Link
                key={m.id}
                href={`/goals/${m.id}`}
                className="block rounded-xl border border-slate-100 dark:border-slate-800 p-4 transition-colors hover:border-indigo-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {m.title}
                  </p>
                  <span className="text-xs capitalize text-slate-500 dark:text-slate-400">
                    {m.status}
                  </span>
                </div>
                <div className="mt-2">
                  <GoalProgressBar progress={m.progress} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Projects ({goal.projects.length})
          </h2>
        </div>
        {goal.projects.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No projects linked to this goal yet.
          </p>
        ) : (
          <div className="space-y-3">
            {goal.projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {p.title}
                  </p>
                  <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                    {p.priority} · {p.status}
                  </p>
                </div>
                {p.tags.length > 0 && (
                  <div className="flex shrink-0 gap-1">
                    {p.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Strategies */}
      {goal.strategies.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Strategies ({goal.strategies.length})
            </h2>
          </div>
          <div className="space-y-2">
            {goal.strategies.map((s) => (
              <Link
                key={s.id}
                href={`/strategies/${s.id}`}
                className="block rounded-xl border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:border-indigo-200"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {s.title}
                </p>
                <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">
                  {s.status}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Linked Tactics */}
      {goal.tactics.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Tactics ({goal.tactics.length})
            </h2>
          </div>
          <div className="space-y-2">
            {goal.tactics.map((t) => (
              <Link
                key={t.id}
                href={`/tactics/${t.id}`}
                className="block rounded-xl border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:border-indigo-200"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {t.title}
                </p>
                <p className="mt-0.5 text-xs capitalize text-slate-500 dark:text-slate-400">
                  {t.status} · {t.riskLevel} risk · {t.confidence}% confidence
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
