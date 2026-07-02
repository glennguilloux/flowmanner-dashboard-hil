import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Shield,
  Zap,
} from "lucide-react";
import { getRecentActivity, type TimelineEvent } from "@/lib/activity-timeline";

function EventIcon({ icon }: { icon: TimelineEvent["icon"] }) {
  switch (icon) {
    case "check":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "x":
      return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
    case "clock":
      return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    case "activity":
      return <Activity className="h-3.5 w-3.5 text-sky-500" />;
    case "shield":
      return <Shield className="h-3.5 w-3.5 text-indigo-500" />;
  }
}

function TypeBadge({ type }: { type: TimelineEvent["type"] }) {
  const config: Record<
    TimelineEvent["type"],
    { label: string; cls: string }
  > = {
    approval: {
      label: "Approved",
      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    rejection: {
      label: "Rejected",
      cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
    },
    tactic_completed: {
      label: "Done",
      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    tactic_needs_review: {
      label: "Review",
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    },
    mission_event: {
      label: "Mission",
      cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400",
    },
  };
  const { label, cls } = config[type];
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        cls,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export async function ActivityTimelinePanel() {
  const events = await getRecentActivity(12);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recent Activity
          </h2>
        </div>
        {events.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
          No recent activity. Approve a tactic or sync some PRs to see events here.
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800"
            aria-hidden="true"
          />

          <div className="space-y-1">
            {events.map((event) => (
              <Link
                key={event.id}
                href={event.href}
                className="group relative flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {/* Icon node on the timeline */}
                <div className="relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-50 dark:border-slate-900 dark:bg-slate-800">
                  <EventIcon icon={event.icon} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                      {event.title}
                    </p>
                    <TypeBadge type={event.type} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {event.description}
                  </p>
                  <time
                    className="mt-1 block text-[11px] text-slate-400"
                    dateTime={event.timestamp.toISOString()}
                    title={event.timestamp.toLocaleString()}
                  >
                    {formatDistanceToNow(event.timestamp, {
                      addSuffix: true,
                    })}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
