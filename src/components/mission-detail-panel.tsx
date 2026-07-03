"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Activity,
  ListTodo,
  FileText,
  Lightbulb,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { MissionLiveFeed } from "@/components/mission-live-feed";

type MissionTask = {
  id: string;
  title: string;
  status: string;
  order: number;
};

type MissionLog = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

type MissionImprovement = {
  id: string;
  suggestion: string;
  status: string;
  createdAt: string;
};

type Props = {
  missionId: string;
  missionTitle: string;
  missionStatus: string;
};

type DetailData = {
  tasks: MissionTask[];
  logs: MissionLog[];
  improvements: MissionImprovement[];
};

const TASK_STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  running: "bg-blue-100 text-blue-700",
  pending: "bg-slate-100 text-slate-600",
  failed: "bg-rose-100 text-rose-700",
};

const LOG_LEVEL_BADGE: Record<string, string> = {
  info: "text-slate-600",
  warn: "text-amber-600",
  error: "text-rose-600",
  debug: "text-slate-400",
};

export function MissionDetailPanel({
  missionId,
  missionTitle,
  missionStatus,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded || data) return;

    setLoading(true);
    setError(null);

    // Fetch tasks, logs, improvements in parallel
    Promise.all([
      fetch(`/api/missions/${missionId}/tasks`).then((r) => r.json()),
      fetch(`/api/missions/${missionId}/logs`).then((r) => r.json()),
      fetch(`/api/missions/${missionId}/improvements`).then((r) => r.json()),
    ])
      .then(([tasksRes, logsRes, improvementsRes]) => {
        setData({
          tasks: tasksRes.data ?? [],
          logs: logsRes.data ?? [],
          improvements: improvementsRes.data ?? [],
        });
      })
      .catch(() => setError("Failed to load mission details"))
      .finally(() => setLoading(false));
  }, [expanded, missionId, data]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
        <Activity className="h-4 w-4 text-sky-600" />
        <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          {missionTitle}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            missionStatus === "running"
              ? "bg-indigo-100 text-indigo-700"
              : missionStatus === "completed"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {missionStatus}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading details...
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}

          {data && !loading && (
            <>
              {/* Tasks */}
              {data.tasks.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <ListTodo className="h-3.5 w-3.5" /> Tasks ({data.tasks.length})
                  </h3>
                  <div className="space-y-1">
                    {data.tasks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-300">
                          {t.title}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            TASK_STATUS_BADGE[t.status] ?? TASK_STATUS_BADGE.pending
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logs */}
              {data.logs.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <FileText className="h-3.5 w-3.5" /> Recent Logs
                  </h3>
                  <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-xs">
                    {data.logs.map((l) => (
                      <div
                        key={l.id}
                        className={LOG_LEVEL_BADGE[l.level] ?? "text-slate-400"}
                      >
                        [{l.level}] {l.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {data.improvements.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Lightbulb className="h-3.5 w-3.5" /> Improvements
                  </h3>
                  <ul className="space-y-1">
                    {data.improvements.map((imp) => (
                      <li
                        key={imp.id}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                      >
                        {imp.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Live feed */}
              {missionStatus === "running" && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Activity className="h-3.5 w-3.5" /> Live Feed
                  </h3>
                  <MissionLiveFeed missionId={missionId} />
                </div>
              )}

              {/* Link to FM */}
              <a
                href={`/missions/${missionId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                Open in FlowManner <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
