"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  X,
  Brain,
  Cpu,
  Activity,
  Sparkles,
  Wrench,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { relativeTime } from "@/lib/relative-time";
import { HermesResolvedList } from "@/components/hermes-resolved-list";
import type { HermesApproval } from "@/types/hermes";

// ── Types (mirrored from hermes-acp.ts to avoid importing server code) ───

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

type HermesData = {
  health: { ok: boolean; error?: string };
  sessions: HermesSession[];
  jobs: HermesJob[];
  skills: HermesSkill[];
  tools: HermesTool[];
  capabilities: { name: string; supported: boolean }[];
  approvals: HermesApproval[];
  latencyMs: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

type Tab = "overview" | "sessions" | "jobs" | "skills" | "approvals";

// ── Component ─────────────────────────────────────────────────────────────

export function HermesPanel({ open, onClose }: Props) {
  const [data, setData] = useState<HermesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hermes", {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const d = (await res.json()) as HermesData;
        setData(d);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setData(null);
      fetchData();
    }
  }, [open, fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Brain className="h-3.5 w-3.5" /> },
    { id: "sessions", label: "Sessions", icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "jobs", label: "Jobs", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "skills", label: "Skills & Tools", icon: <Sparkles className="h-3.5 w-3.5" /> },
    ...(data?.approvals?.some((a) => a.status === "pending")
      ? [
          {
            id: "approvals" as const,
            label: `Approvals (${data.approvals.filter((a) => a.status === "pending").length})`,
            icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Hermes Agent Panel"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Hermes Agent
            </h2>
            {data?.health.ok && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                Online
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Refresh"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-2 dark:border-slate-800">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "border-violet-500 text-violet-700 dark:text-violet-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && !data && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
          )}

          {!loading && !data && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                Cannot reach Hermes API server
              </p>
            </div>
          )}

          {data && tab === "overview" && <OverviewTab data={data} />}
          {data && tab === "sessions" && <SessionsTab sessions={data.sessions} />}
          {data && tab === "jobs" && <JobsTab jobs={data.jobs} />}
          {data && tab === "skills" && (
            <SkillsTab skills={data.skills} tools={data.tools} />
          )}
          {data && tab === "approvals" && (
            <ApprovalsTab approvals={data.approvals} />
          )}
        </div>
      </aside>
    </>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: HermesData }) {
  const running = data.jobs.filter((j) => j.status === "running");
  const failed = data.jobs.filter((j) => j.status === "failed");
  const active = data.sessions.filter((s) => s.status === "active");
  const caps = data.capabilities.filter((c) => c.supported);

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox
          label="Sessions"
          value={data.sessions.length}
          hint={`${active.length} active`}
          icon={<Cpu className="h-4 w-4 text-violet-600" />}
        />
        <StatBox
          label="Jobs"
          value={data.jobs.length}
          hint={`${running.length} running`}
          icon={<Activity className="h-4 w-4 text-indigo-600" />}
          accent={failed.length > 0}
        />
        <StatBox
          label="Skills"
          value={data.skills.length}
          icon={<Sparkles className="h-4 w-4 text-amber-600" />}
        />
        <StatBox
          label="Tools"
          value={data.tools.length}
          icon={<Wrench className="h-4 w-4 text-emerald-600" />}
        />
      </div>

      {/* Capabilities */}
      {caps.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Capabilities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {caps.map((c) => (
              <span
                key={c.name}
                className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent running jobs */}
      {running.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Running Jobs
          </h3>
          <div className="space-y-2">
            {running.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      {/* Failed jobs */}
      {failed.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-rose-500">
            <AlertTriangle className="h-3 w-3" />
            Failed ({failed.length})
          </h3>
          <div className="space-y-2">
            {failed.slice(0, 5).map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        </div>
      )}

      {/* Latency */}
      <p className="text-center text-xs text-slate-400">
        Fetched in {data.latencyMs}ms
      </p>
    </div>
  );
}

function SessionsTab({ sessions }: { sessions: HermesSession[] }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Cpu className="h-6 w-6 text-slate-300" />}
        message="No sessions yet"
      />
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">
              {s.id}
            </p>
            <StatusPill status={s.status} />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {s.model ?? "default model"}
            {s.message_count != null ? ` · ${s.message_count} messages` : ""}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
          </p>
        </div>
      ))}
    </div>
  );
}

function JobsTab({ jobs }: { jobs: HermesJob[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-6 w-6 text-slate-300" />}
        message="No jobs yet"
      />
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((j) => (
        <JobCard key={j.id} job={j} />
      ))}
    </div>
  );
}

function SkillsTab({
  skills,
  tools,
}: {
  skills: HermesSkill[];
  tools: HermesTool[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Skills ({skills.length})
        </h3>
        {skills.length === 0 ? (
          <p className="text-xs text-slate-400">No skills extracted yet</p>
        ) : (
          <div className="space-y-2">
            {skills.map((sk) => (
              <div
                key={sk.name}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {sk.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {sk.category}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {sk.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Wrench className="h-3 w-3 text-emerald-500" />
          Tools ({tools.length})
        </h3>
        {tools.length === 0 ? (
          <p className="text-xs text-slate-400">No tools available</p>
        ) : (
          <div className="space-y-2">
            {tools.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {t.name}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared small components ───────────────────────────────────────────────

function StatBox({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-3",
        accent
          ? "border-rose-200 bg-rose-50"
          : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50",
      ].join(" ")}
    >
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <p
        className={[
          "text-xl font-bold",
          accent
            ? "text-rose-700"
            : "text-slate-900 dark:text-slate-100",
        ].join(" ")}
      >
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function JobCard({ job }: { job: HermesJob }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {job.task ?? job.id.slice(0, 12)}
        </p>
        <StatusPill status={job.status} />
      </div>
      <p className="mt-1 text-[10px] text-slate-400">
        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
      </p>
      {job.error && (
        <p className="mt-1 truncate text-xs text-rose-500">{job.error}</p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    running: "bg-indigo-100 text-indigo-700",
    completed: "bg-emerald-100 text-emerald-700",
    idle: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-rose-100 text-rose-700",
    error: "bg-rose-100 text-rose-700",
    cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${map[status ?? "idle"] ?? map.idle}`}
    >
      {status ?? "unknown"}
    </span>
  );
}

function ApprovalsTab({ approvals }: { approvals: HermesApproval[] }) {
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <AlertTriangle className="h-3 w-3 animate-pulse" />
            Pending ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-3"
              >
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {a.action}
                </p>
                {a.reason && (
                  <p className="mt-0.5 text-xs text-slate-500">{a.reason}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {a.tool && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800">
                      {a.tool}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {relativeTime(a.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-600">
            → Use the Agent Approvals panel on the dashboard to approve or deny
          </p>
        </div>
      )}

      {pending.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
          message="No pending approvals"
        />
      )}

      {resolved.length > 0 && (
        <HermesResolvedList approvals={resolved} initialLimit={10} />
      )}
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3">{icon}</div>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
