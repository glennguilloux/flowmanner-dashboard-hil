import Link from "next/link";
import { getMissionHealth } from "@/lib/missions";
import { CheckCircle2, XCircle, Clock, Activity, AlertTriangle } from "lucide-react";

export async function MissionHealthPanel() {
  const health = await getMissionHealth();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mission Health</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15"
                fill="none" stroke="#e2e8f0" strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke={health.successRate >= 80 ? "#10b981" : health.successRate >= 60 ? "#f59e0b" : "#ef4444"}
                strokeWidth="3"
                strokeDasharray={`${(health.successRate / 100) * 94.2} 94.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-slate-100">
              {health.successRate}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Done" value={health.completed} />
        <Stat icon={<XCircle className="h-4 w-4 text-rose-600" />} label="Failed" value={health.failed} accent={health.failed > 0} />
        <Stat icon={<Clock className="h-4 w-4 text-indigo-600" />} label="Running" value={health.running} />
        <Stat icon={<Clock className="h-4 w-4 text-amber-600" />} label="Pending" value={health.pending} />
      </div>

      {health.failed > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            Recent Failures
          </h3>
          <div className="space-y-1.5">
            {health.recentFailures.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg bg-rose-50/50 px-3 py-2 text-sm"
              >
                <span className="truncate text-slate-700">{f.title}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {f.id.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-3 text-center",
        accent ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50 dark:bg-slate-800",
      ].join(" ")}
    >
      <div className="mb-1 flex justify-center">{icon}</div>
      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
