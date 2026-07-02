import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Clock, GitPullRequest, Inbox } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
  href?: string;
  hint?: string;
};

export function StatCard({ label, value, icon, accent, href, hint }: StatCardProps) {
  const inner = (
    <div
      className={[
        "rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors",
        accent ? "border-rose-200" : "border-slate-200 dark:border-slate-800",
        href ? "hover:border-indigo-300" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className={["rounded-lg p-2", accent ? "bg-rose-100" : "bg-slate-100 dark:bg-slate-800"].join(" ")}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

type DashboardStatsProps = {
  prCount: number;
  ciFailingCount: number;
  inboxPending: number;
  inboxSyncedAt: string | null;
  missionsRunning: number;
  missionsPending: number;
};

export function DashboardStatCards(props: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Open PRs"
        value={props.prCount}
        icon={<GitPullRequest className="h-5 w-5 text-indigo-600" />}
        href="/prs"
      />
      <StatCard
        label="CI failing"
        value={props.ciFailingCount}
        icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
        accent={props.ciFailingCount > 0}
        href="/prs"
      />
      <StatCard
        label="Inbox interrupts"
        value={props.inboxPending}
        icon={<Inbox className="h-5 w-5 text-amber-600" />}
        accent={props.inboxPending > 0}
        hint={
          props.inboxSyncedAt
            ? `Synced ${formatDistanceToNow(new Date(props.inboxSyncedAt), { addSuffix: true })}`
            : "Not yet synced"
        }
      />
      <StatCard
        label="Missions in flight"
        value={props.missionsRunning + props.missionsPending}
        icon={<Clock className="h-5 w-5 text-sky-600" />}
      />
    </div>
  );
}
