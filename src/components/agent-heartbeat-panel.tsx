"use client";

import { useEffect, useState } from "react";
import { Bot, Wifi, WifiOff, Loader2 } from "lucide-react";

type Heartbeat = {
  id: string;
  agentId: string;
  status: string;
  task: string;
  progress: number | null;
  logLine: string | null;
  tone: string;
  createdAt: string;
  stale: boolean;
};

const TONE_BORDER: Record<string, string> = {
  neutral: "border-slate-200 dark:border-slate-700",
  info: "border-blue-300",
  success: "border-emerald-300",
  warn: "border-amber-300",
  error: "border-rose-300",
};

const STATUS_DOT: Record<string, string> = {
  working: "bg-blue-500",
  idle: "bg-slate-400",
  waiting: "bg-amber-500",
  error: "bg-rose-500",
  done: "bg-emerald-500",
};

export function AgentHeartbeatPanel() {
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const poll = () => {
      fetch("/api/agent/heartbeats")
        .then((r) => r.json())
        .then((data) => setHeartbeats(data.data ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    poll();
    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading agents...
      </div>
    );
  }

  if (heartbeats.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Agent Status
        </h2>
        <span className="text-xs text-slate-500">
          {heartbeats.length} agent{heartbeats.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {heartbeats.map((hb) => (
          <div
            key={hb.agentId}
            className={`rounded-xl border p-4 transition-opacity ${
              TONE_BORDER[hb.tone] ?? TONE_BORDER.neutral
            } ${hb.stale ? "opacity-50" : ""}`}
          >
            <div className="mb-2 flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  STATUS_DOT[hb.status] ?? "bg-slate-400"
                }`}
              />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {hb.agentId}
              </span>
              {hb.stale && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  stale
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {hb.task}
            </p>

            {hb.progress != null && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(100, hb.progress)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {hb.progress}%
                </p>
              </div>
            )}

            {hb.logLine && (
              <p className="mt-2 truncate font-mono text-[10px] text-slate-400">
                {hb.logLine}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
