"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Sparkles,
  Wrench,
  Activity,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { relativeTime } from "@/lib/relative-time";

const REFRESH_INTERVAL_S = 30;

// ── Types (mirrored from hermes-acp.ts for client-safe usage) ─────────────

type HermesSession = {
  id: string;
  created_at: string;
  model?: string;
  status?: "active" | "idle" | "completed" | "error";
  message_count?: number;
};

type HermesJob = {
  id: string;
  session_id?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  task?: string;
  created_at: string;
  error?: string;
};

type HermesSkill = {
  name: string;
  description: string;
  category: string;
};

type HermesTool = {
  name: string;
  description: string;
};

type HermesCapability = {
  name: string;
  supported: boolean;
  description?: string;
};

type HermesData = {
  health: { ok: boolean; error?: string };
  sessions: HermesSession[];
  jobs: HermesJob[];
  skills: HermesSkill[];
  tools: HermesTool[];
  capabilities: HermesCapability[];
  latencyMs: number;
};

// ── Status helpers ────────────────────────────────────────────────────────

function SessionStatusBadge({ status }: { status: HermesSession["status"] }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    idle: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    completed: "bg-indigo-100 text-indigo-700",
    error: "bg-rose-100 text-rose-700",
  };
  const label = status ?? "unknown";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[label] ?? map.idle}`}
    >
      {label}
    </span>
  );
}

function JobStatusBadge({ status }: { status: HermesJob["status"] }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    running: "bg-indigo-100 text-indigo-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700",
    cancelled:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? map.pending}`}
    >
      {status}
    </span>
  );
}

// ── Sub-sections ──────────────────────────────────────────────────────────

function SessionRow({ s }: { s: HermesSession }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {s.id.slice(0, 12)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {s.model ?? "default model"}
          {s.message_count != null ? ` · ${s.message_count} msgs` : ""}
          {" · "}
          <time
            dateTime={new Date(s.created_at).toISOString()}
            title={new Date(s.created_at).toLocaleString()}
          >
            {relativeTime(s.created_at)}
          </time>
        </p>
      </div>
      <SessionStatusBadge status={s.status} />
    </div>
  );
}

function JobRow({ j }: { j: HermesJob }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {j.task ?? j.id.slice(0, 12)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <time
            dateTime={new Date(j.created_at).toISOString()}
            title={new Date(j.created_at).toLocaleString()}
          >
            {relativeTime(j.created_at)}
          </time>
          {j.error && (
            <span className="ml-2 text-rose-500">
              · {j.error.slice(0, 60)}
            </span>
          )}
        </p>
      </div>
      <JobStatusBadge status={j.status} />
    </div>
  );
}

function SkillChip({ skill }: { skill: HermesSkill }) {
  return (
    <div
      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50"
      title={skill.description}
    >
      <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
        {skill.name}
      </p>
      <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
        {skill.category}
      </p>
    </div>
  );
}

function ToolChip({ tool }: { tool: HermesTool }) {
  return (
    <div
      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50"
      title={tool.description}
    >
      <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
        {tool.name}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function HermesAgentsPanel() {
  const [data, setData] = useState<HermesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_S);
  const secondsRef = useRef(REFRESH_INTERVAL_S);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hermes", {
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const d = (await res.json()) as HermesData;
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

  // Loading skeleton on first fetch
  if (!data && loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Hermes Agent
          </h2>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </section>
    );
  }

  // Unreachable state
  if (!data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Hermes Agent
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800">
          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
          Failed to load Hermes data
        </div>
      </section>
    );
  }

  const { health, sessions, jobs, skills, tools, capabilities, latencyMs } =
    data;

  const runningJobs = jobs.filter((j) => j.status === "running");
  const failedJobs = jobs.filter((j) => j.status === "failed");
  const activeSessions = sessions.filter((s) => s.status === "active");
  const supportedCaps = capabilities.filter((c) => c.supported);

  if (!health.ok) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Hermes Agent
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800">
          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
          {health.error ?? "Hermes API server unreachable"}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Hermes Agent
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online · {latencyMs}ms
          </span>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Refresh Hermes data"
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

      {/* Summary strip */}
      <div
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="group"
        aria-label="Hermes counters"
      >
        <Counter
          icon={<Cpu className="h-3.5 w-3.5 text-violet-600" />}
          label="Sessions"
          value={sessions.length}
          hint={`${activeSessions.length} active`}
        />
        <Counter
          icon={<Activity className="h-3.5 w-3.5 text-indigo-600" />}
          label="Jobs"
          value={jobs.length}
          hint={`${runningJobs.length} running`}
          accent={failedJobs.length > 0}
        />
        <Counter
          icon={<Sparkles className="h-3.5 w-3.5 text-amber-600" />}
          label="Skills"
          value={skills.length}
        />
        <Counter
          icon={<Wrench className="h-3.5 w-3.5 text-emerald-600" />}
          label="Tools"
          value={tools.length}
        />
      </div>

      {/* Capabilities */}
      {supportedCaps.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Capabilities ({supportedCaps.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {supportedCaps.slice(0, 8).map((c) => (
              <span
                key={c.name}
                className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                title={c.description}
              >
                {c.name}
              </span>
            ))}
            {supportedCaps.length > 8 && (
              <span className="text-xs text-slate-400">
                +{supportedCaps.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Running jobs */}
      {runningJobs.length > 0 && (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Activity className="h-3 w-3 animate-pulse text-indigo-500" />
            Running ({runningJobs.length})
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {runningJobs.slice(0, 5).map((j) => (
              <JobRow key={j.id} j={j} />
            ))}
          </div>
        </div>
      )}

      {/* Recent failures */}
      {failedJobs.length > 0 && (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            Failed ({failedJobs.length})
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {failedJobs.slice(0, 3).map((j) => (
              <JobRow key={j.id} j={j} />
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3 text-slate-400" />
            Recent Sessions
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sessions.slice(0, 5).map((s) => (
              <SessionRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      )}

      {/* Skills & Tools */}
      {(skills.length > 0 || tools.length > 0) && (
        <div>
          {skills.length > 0 && (
            <>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Skills ({skills.length})
              </h3>
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                {skills.slice(0, 6).map((sk) => (
                  <SkillChip key={sk.name} skill={sk} />
                ))}
              </div>
            </>
          )}
          {tools.length > 0 && (
            <>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Wrench className="h-3 w-3 text-emerald-500" />
                Tools ({tools.length})
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {tools.slice(0, 6).map((t) => (
                  <ToolChip key={t.name} tool={t} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 &&
        jobs.length === 0 &&
        skills.length === 0 &&
        tools.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800">
            Hermes is online but has no active sessions, jobs, or skills yet.
          </p>
        )}
    </section>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function Counter({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        accent
          ? "border-rose-200 bg-rose-50"
          : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
      }`}
    >
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={`text-base font-bold leading-tight ${
            accent
              ? "text-rose-700"
              : "text-slate-900 dark:text-slate-100"
          }`}
        >
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
          {hint && (
            <span className="ml-1 normal-case tracking-normal text-slate-400">
              · {hint}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
