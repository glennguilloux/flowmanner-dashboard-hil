import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";
import type { MissionHealth } from "@/lib/missions";

type Mission = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

type MissionsSummary = {
  running: number;
  pending: number;
};

type Props = {
  missions: MissionsSummary;
  missionList: Mission[];
  health: MissionHealth;
};

export function DashboardMissionsPanel({ missions, missionList, health }: Props) {
  const active = missions.running + missions.pending;
  const rateColor =
    health.total === 0
      ? "text-slate-500 dark:text-slate-400"
      : health.successRate >= 80
        ? "text-emerald-600"
        : health.successRate >= 60
          ? "text-amber-600"
          : "text-rose-600";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-sky-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Missions ({active} active)
          </h2>
          <span
            className={["text-sm font-medium", rateColor].join(" ")}
            title={`${health.completed} completed of ${health.total} total missions`}
          >
            · {health.total === 0
              ? "no history yet"
              : `${health.successRate}% success rate`}
          </span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {missions.running} running · {missions.pending} pending
        </span>
      </div>

      {/* Summary strip — folded from MissionHealthPanel */}
      <div
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="group"
        aria-label="Mission counters"
      >
        <Counter
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          label="Done"
          value={health.completed}
        />
        <Counter
          icon={<XCircle className="h-3.5 w-3.5 text-rose-600" />}
          label="Failed"
          value={health.failed}
          accent={health.failed > 0}
        />
        <Counter
          icon={<Clock className="h-3.5 w-3.5 text-indigo-600" />}
          label="Running"
          value={health.running}
        />
        <Counter
          icon={<Clock className="h-3.5 w-3.5 text-amber-600" />}
          label="Pending"
          value={health.pending}
        />
      </div>

      {/* Recent failures — only when there are any */}
      {health.failed > 0 && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <AlertTriangle className="h-3 w-3 text-rose-500" aria-hidden="true" />
            Recent Failures ({health.failed})
          </h3>
          <div className="space-y-1">
            {health.recentFailures.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-slate-700">{f.title}</span>
                <span className="shrink-0 font-mono text-xs text-slate-400">
                  {f.id.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-flight missions list */}
      {missionList.length === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          ✓ No active missions.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {missionList.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {m.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{m.id.slice(0, 8)}</span>
                  {" · "}
                  <time
                    dateTime={new Date(m.createdAt).toISOString()}
                    title={new Date(m.createdAt).toLocaleString()}
                  >
                    {formatDistanceToNow(new Date(m.createdAt), {
                      addSuffix: true,
                    })}
                  </time>
                </p>
              </div>
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  m.status === "running"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-amber-100 text-amber-700",
                ].join(" ")}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Counter({
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
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        accent
          ? "border-rose-200 bg-rose-50"
          : "border-slate-100 bg-slate-50 dark:bg-slate-800",
      ].join(" ")}
    >
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={[
            "text-base font-bold leading-tight",
            accent ? "text-rose-700" : "text-slate-900 dark:text-slate-100",
          ].join(" ")}
        >
          {value}
        </p>
        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}
