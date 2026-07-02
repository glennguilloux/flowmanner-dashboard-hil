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
};

import { formatDistanceToNow } from "date-fns";

export function DashboardMissionsPanel({ missions, missionList }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Missions in flight ({missions.running + missions.pending})
        </h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {missions.running} running · {missions.pending} pending
        </span>
      </div>
      {missionList.length === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          ✓ No active missions.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {missionList.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{m.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {m.id.slice(0, 8)} ·{" "}
                  <time dateTime={new Date(m.createdAt).toISOString()} title={new Date(m.createdAt).toLocaleString()}>
                    {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                  </time>
                </p>
              </div>
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  m.status === "running" ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700",
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
