"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Database,
  Cpu,
  GitBranch,
  FolderGit2,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Brain,
  Terminal,
  RefreshCw,
} from "lucide-react";

const REFRESH_INTERVAL_S = 30;

// ── Types (mirrored from system-health.ts) ────────────────────────────────

type ServiceStatus = "healthy" | "degraded" | "down";

type ServiceHealth = {
  id: string;
  name: string;
  icon: string;
  status: ServiceStatus;
  latencyMs: number | null;
  detail: string;
};

type HealthData = {
  ok: boolean;
  services: ServiceHealth[];
  timestamp: string;
};

// ── Icon map ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Database,
  Cpu,
  GitBranch,
  FolderGit2,
  Boxes,
  Server,
  AlertTriangle,
  Brain,
  Terminal,
};

// ── Sub-components ────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ServiceStatus }) {
  const color =
    status === "healthy"
      ? "bg-emerald-500"
      : status === "degraded"
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} ${status !== "healthy" ? "animate-pulse" : ""}`}
      aria-hidden="true"
    />
  );
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === "healthy")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "degraded")
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
}

// ── Main component ────────────────────────────────────────────────────────

export function SystemHealthPanel() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_S);
  const secondsRef = useRef(REFRESH_INTERVAL_S);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system-health", {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const d = (await res.json()) as HealthData;
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

  // Initial fetch + interval polling
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchHealth();

    const interval = setInterval(() => {
      secondsRef.current -= 1;
      if (secondsRef.current <= 0) {
        fetchHealth();
      } else {
         
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchHealth]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const services = data?.services ?? [];
  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const allHealthy =
    services.length > 0 && healthyCount === services.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            System Health
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {services.length > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                allHealthy
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <StatusDot status={allHealthy ? "healthy" : "degraded"} />
              {healthyCount}/{services.length} online
            </span>
          )}
          <button
            type="button"
            onClick={fetchHealth}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Refresh system health"
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

      {/* Loading skeleton on first load */}
      {services.length === 0 && loading && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800"
            >
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service grid */}
      {services.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {services.map((svc) => {
            const Icon = ICON_MAP[svc.icon] ?? Server;
            const borderColor =
              svc.status === "healthy"
                ? "border-slate-100 dark:border-slate-800"
                : svc.status === "degraded"
                  ? "border-amber-200"
                  : "border-rose-200";
            const bgColor =
              svc.status === "down"
                ? "bg-rose-50/50 dark:bg-rose-950/20"
                : "";

            return (
              <div
                key={svc.id}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${borderColor} ${bgColor}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    svc.status === "healthy"
                      ? "bg-indigo-50 dark:bg-indigo-950/40"
                      : svc.status === "degraded"
                        ? "bg-amber-50 dark:bg-amber-950/40"
                        : "bg-rose-50 dark:bg-rose-950/40"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      svc.status === "healthy"
                        ? "text-indigo-600"
                        : svc.status === "degraded"
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {svc.name}
                    </p>
                    <StatusIcon status={svc.status} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {svc.detail}
                  </p>
                  {svc.latencyMs !== null && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {svc.latencyMs}ms
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
