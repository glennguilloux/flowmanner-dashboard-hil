import { Clock, Timer, TrendingUp, TrendingDown } from "lucide-react";

export function TimeTrackingDisplay({
  estimated,
  actual,
}: {
  estimated: number | null;
  actual: number | null;
}) {
  if (estimated === null && actual === null) {
    return null;
  }

  const overBudget =
    estimated !== null && actual !== null && actual > estimated;
  const underBudget =
    estimated !== null && actual !== null && actual < estimated;
  const onTrack =
    estimated !== null && actual !== null && actual === estimated;

  function formatMinutes(min: number): string {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Time Tracking
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Estimated */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Timer className="h-3 w-3" />
            Estimated
          </div>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {estimated !== null ? formatMinutes(estimated) : "—"}
          </p>
        </div>

        {/* Actual */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            Actual
          </div>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {actual !== null ? formatMinutes(actual) : "—"}
          </p>
        </div>
      </div>

      {/* Status indicator */}
      {estimated !== null && actual !== null && (
        <div
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
            overBudget
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              : underBudget
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          }`}
        >
          {overBudget ? (
            <>
              <TrendingUp className="h-3 w-3" />
              {formatMinutes(actual - estimated)} over estimate
            </>
          ) : underBudget ? (
            <>
              <TrendingDown className="h-3 w-3" />
              {formatMinutes(estimated - actual)} under estimate
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              On track
            </>
          )}
        </div>
      )}
    </div>
  );
}
