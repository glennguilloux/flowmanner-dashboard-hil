"use client";

import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUpCircle,
  RotateCcw,
  Play,
  Flag,
  Eye,
  MessageSquare,
  Zap,
} from "lucide-react";

type TacticEvent = {
  id: string;
  tacticId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorType: string;
  actorName: string;
  detail: string | null;
  metadata: unknown;
  createdAt: string;
};

type Props = {
  tacticId: string;
};

const EVENT_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; color: string; bg: string }
> = {
  proposed: { icon: Flag, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
  reviewed: { icon: Eye, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  gated: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  approved: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  rejected: { icon: XCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
  requested_info: { icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
  escalated: { icon: ArrowUpCircle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  execution_started: { icon: Play, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
  completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  failed: { icon: XCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
  reset: { icon: RotateCcw, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
};

export function EventTimeline({ tacticId }: Props) {
  const [events, setEvents] = useState<TacticEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useRef(() => {
    fetch(`/api/tactics/${tacticId}/events`)
      .then((r) => r.json())
      .then((data) => setEvents(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  useEffect(() => {
    fetchEvents.current();

    // Poll every 10s so same-page actions (approve/reject/reset) show up
    // without requiring a full page reload.
    intervalRef.current = setInterval(fetchEvents.current, 10_000);

    // Also refetch when the tab regains focus.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchEvents.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tacticId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Clock className="h-4 w-4 animate-spin" /> Loading events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No events recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((evt, i) => {
        const config = EVENT_CONFIG[evt.eventType] ?? {
          icon: Zap,
          color: "text-slate-500",
          bg: "bg-slate-100 dark:bg-slate-800",
        };
        const Icon = config.icon;
        const isLast = i === events.length - 1;

        return (
          <div key={evt.id} className="relative flex gap-3">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
            )}

            {/* Icon */}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}
            >
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium capitalize text-slate-900 dark:text-slate-100">
                  {evt.eventType.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-400">
                  by {evt.actorName}
                </span>
              </div>
              {evt.detail && (
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {evt.detail}
                </p>
              )}
              {evt.fromStatus && evt.toStatus && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {evt.fromStatus} → {evt.toStatus}
                </p>
              )}
              <time className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(evt.createdAt), {
                  addSuffix: true,
                })}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
