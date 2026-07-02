"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Terminal,
  FolderOpen,
  Clock,
  MessageSquare,
  FileCode2,
  XCircle,
  RefreshCw,
  Hash,
} from "lucide-react";
import { relativeTime } from "@/lib/relative-time";

const REFRESH_INTERVAL_S = 30;

// ── Types (mirrored from opencode.ts for client-safe usage) ───────────────

type OpenCodeSession = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  filePaths: string[];
  tokenCount: number | null;
};

type OpenCodeProject = {
  name: string;
  path: string;
  sessionCount: number;
};

type OpenCodeHealth = {
  ok: boolean;
  version: string | null;
  storagePath: string;
  projectCount: number;
  totalSessions: number;
  error?: string;
};

type OpenCodeData = {
  health: OpenCodeHealth;
  sessions: OpenCodeSession[];
  projects: OpenCodeProject[];
  latencyMs: number;
};

// ── Sub-components ────────────────────────────────────────────────────────

function SessionRow({ s }: { s: OpenCodeSession }) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {s.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {s.model !== "unknown" && (
              <span className="inline-flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {s.model}
              </span>
            )}
            {s.messageCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {s.messageCount} msgs
              </span>
            )}
            {s.tokenCount != null && s.tokenCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {s.tokenCount.toLocaleString()} tokens
              </span>
            )}
            <time
              dateTime={new Date(s.updatedAt).toISOString()}
              title={new Date(s.updatedAt).toLocaleString()}
            >
              {relativeTime(s.updatedAt)}
            </time>
          </div>
          {s.filePaths.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {s.filePaths.slice(0, 4).map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                >
                  <FileCode2 className="h-2.5 w-2.5" />
                  {f.split("/").pop()}
                </span>
              ))}
              {s.filePaths.length > 4 && (
                <span className="text-[10px] text-slate-400">
                  +{s.filePaths.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ p }: { p: OpenCodeProject }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
      <FolderOpen className="h-4 w-4 shrink-0 text-sky-600" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
          {p.name}
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {p.sessionCount} session{p.sessionCount !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function OpenCodePanel() {
  const [data, setData] = useState<OpenCodeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_S);
  const secondsRef = useRef(REFRESH_INTERVAL_S);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/opencode", {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const d = (await res.json()) as OpenCodeData;
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

  // Loading skeleton
  if (!data && loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-sky-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            OpenCode
          </h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            OpenCode
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800">
          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
          Failed to load OpenCode data
        </div>
      </section>
    );
  }

  const { health, sessions, projects, latencyMs } = data;

  if (!health.ok) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            OpenCode
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800">
          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
          {health.error ?? "OpenCode storage not found"}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-sky-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            OpenCode
          </h2>
          {health.version && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
              v{health.version}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {health.totalSessions} sessions · {latencyMs}ms
          </span>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Refresh OpenCode data"
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
        {data && (
          <>
            {" · "}
            <span suppressHydrationWarning>
              Last checked {new Date().toLocaleTimeString()}
            </span>
          </>
        )}
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <FolderOpen className="h-3 w-3 text-sky-500" />
            Projects ({projects.length})
          </h3>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard key={p.name} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3 text-slate-400" />
            Recent Sessions ({sessions.length})
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.slice(0, 8).map((s) => (
              <SessionRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && projects.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800">
          OpenCode storage found at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-700">
            {health.storagePath}
          </code>{" "}
          but no sessions recorded yet.
        </p>
      )}
    </section>
  );
}
