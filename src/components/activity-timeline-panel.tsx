"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Shield,
  Zap,
  RefreshCw,
} from "lucide-react";
import { relativeTime } from "@/lib/relative-time";

const REFRESH_INTERVAL_S = 30;

// ── Types (serialized version of TimelineEvent for JSON transport) ────────

type TimelineEventType =
  | "approval"
  | "rejection"
  | "tactic_completed"
  | "tactic_needs_review"
  | "mission_event";

type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: string; // ISO string from API
  href: string;
  icon: "check" | "x" | "clock" | "activity" | "shield";
};

type TimelineData = {
  ok: boolean;
  events: TimelineEvent[];
  timestamp: string;
};

// ── Sub-components ────────────────────────────────────────────────────────

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

function TypeBadge({ type }: { type: TimelineEventType }) {
  const config: Record<TimelineEventType, { label: string; cls: string }> = {
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
      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function ActivityTimelinePanel() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_S);
  const secondsRef = useRef(REFRESH_INTERVAL_S);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/activity-timeline", {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const d = (await res.json()) as TimelineData;
        setData(d);
      }
    } catch {
      // Keep previous data on fetch failure
    } finally {
      setLoading(false);
      secondsRef.current = REFRESH_INTERVAL_S;
      setSecondsLeft(REFRESH_INTERVAL_S);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      secondsRef.current -= 1;
      if (secondsRef.current <= 0) {
        fetchData();
      } else {
         
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const events = data?.events ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recent Activity
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Refresh activity timeline"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Polling indicator */}
      <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        Auto-refreshes in {secondsLeft}s
        {data?.timestamp && (
          <>
            {" · "}
            <span suppressHydrationWarning>
              Last checked {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </>
        )}
      </div>

      {/* Loading skeleton */}
      {events.length === 0 && loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-2 py-2.5">
              <div className="h-[30px] w-[30px] shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No recent activity. Approve a tactic or sync some PRs to see events
          here.
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
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
                    dateTime={event.timestamp}
                    title={new Date(event.timestamp).toLocaleString()}
                  >
                    {relativeTime(event.timestamp)}
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
