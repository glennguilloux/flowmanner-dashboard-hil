"use client";

import { useState } from "react";
import { usePolling } from "@/hooks/use-polling";
import { relativeTime } from "@/lib/relative-time";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Terminal,
} from "lucide-react";

// ── Types (mirrored from hermes-acp.ts for client-safe usage) ─────────────

type HermesApproval = {
  id: string;
  session_id?: string;
  job_id?: string;
  action: string;
  reason?: string;
  tool?: string;
  status: "pending" | "approved" | "denied" | "expired";
  scope?: string;
  decided_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  timeout_seconds?: number | null;
};

type HermesApprovalData = {
  ok: boolean;
  approvals: HermesApproval[];
};

// ── Scope options ─────────────────────────────────────────────────────────

const SCOPE_OPTIONS = [
  {
    value: "allow_once",
    label: "Allow once",
    description: "Approve this single action only",
    color: "bg-emerald-600 hover:bg-emerald-700",
    icon: CheckCircle2,
  },
  {
    value: "allow_session",
    label: "Allow for session",
    description: "Auto-approve similar actions for this session",
    color: "bg-indigo-600 hover:bg-indigo-700",
    icon: Shield,
  },
  {
    value: "allow_always",
    label: "Allow always",
    description: "Permanently approve this action type",
    color: "bg-violet-600 hover:bg-violet-700",
    icon: CheckCircle2,
  },
  {
    value: "deny",
    label: "Deny",
    description: "Block this action and abort the task",
    color: "bg-rose-600 hover:bg-rose-700",
    icon: XCircle,
  },
] as const;

// ── Main component ────────────────────────────────────────────────────────

export function HermesApprovalPanel() {
  const { data, loading, secondsLeft, refresh } =
    usePolling<HermesApprovalData>("/api/hermes/approvals");

  const approvals = data?.approvals ?? [];
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  if (!data && loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Agent Approvals
          </h2>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Agent Approvals
          </h2>
          {pending.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              {pending.length} pending
            </span>
          )}
          {resolved.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <CheckCircle2 className="h-3 w-3" />
              {resolved.length} resolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">
            {secondsLeft}s
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Refresh approvals"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 ? (
        <div className="space-y-3">
          {pending.map((a) => (
            <ApprovalCard key={a.id} approval={a} onDecided={refresh} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          ✓ No pending approval requests from the agent.
        </p>
      )}

      {/* Recently resolved */}
      {resolved.length > 0 && (
        <ResolvedList approvals={resolved} />
      )}
    </section>
  );
}

// ── Approval card with decision UI ────────────────────────────────────────

function ApprovalCard({
  approval,
  onDecided,
}: {
  approval: HermesApproval;
  onDecided: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedScope, setSelectedScope] = useState<
    "allow_once" | "allow_session" | "allow_always" | "deny"
  >("allow_once");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/hermes/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: approval.id,
          scope: selectedScope,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setNotes("");
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {approval.action}
            </p>
          </div>
          {approval.reason && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {approval.reason}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {approval.tool && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                {approval.tool}
              </span>
            )}
            {approval.session_id && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                session:{approval.session_id.slice(0, 8)}
              </span>
            )}
            {approval.timeout_seconds != null && approval.timeout_seconds > 0 && (
              <span className="flex items-center gap-0.5 text-amber-600">
                <Clock className="h-3 w-3" />
                {approval.timeout_seconds}s timeout
              </span>
            )}
            <time
              dateTime={new Date(approval.created_at).toISOString()}
              title={new Date(approval.created_at).toLocaleString()}
            >
              {relativeTime(approval.created_at)}
            </time>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Expanded: full action detail + decision form */}
      {expanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {/* Full action text */}
          {approval.action.length > 100 && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                {approval.action}
              </p>
            </div>
          )}

          {/* Scope selector */}
          <div className="grid gap-2 sm:grid-cols-2">
            {SCOPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedScope(opt.value)}
                  className={[
                    "flex items-start gap-2 rounded-xl border p-3 text-left text-sm transition-all",
                    selectedScope === opt.value
                      ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-300 dark:border-indigo-600 dark:bg-indigo-950/30"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800",
                  ].join(" ")}
                >
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      selectedScope === opt.value
                        ? "text-indigo-600"
                        : "text-slate-400"
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        selectedScope === opt.value
                          ? "text-indigo-700 dark:text-indigo-300"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the agent..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800"
          />

          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50",
              SCOPE_OPTIONS.find((o) => o.value === selectedScope)?.color ??
                "bg-indigo-600 hover:bg-indigo-700",
            ].join(" ")}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : selectedScope === "deny" ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {submitting
              ? "Submitting..."
              : selectedScope === "deny"
                ? "Deny action"
                : `Approve (${SCOPE_OPTIONS.find((o) => o.value === selectedScope)?.label})`}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Resolved approvals list ───────────────────────────────────────────────

function ResolvedList({ approvals }: { approvals: HermesApproval[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? approvals : approvals.slice(0, 5);

  return (
    <div className="mt-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Clock className="h-3 w-3 text-slate-400" />
        Recently Resolved ({approvals.length})
      </h3>
      <div className="space-y-1.5">
        {visible.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {a.status === "approved" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : a.status === "denied" ? (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
                <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                  {a.action}
                </p>
              </div>
              {a.notes && (
                <p className="ml-5 truncate text-[11px] text-slate-500">
                  {a.notes}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.scope && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  {a.scope}
                </span>
              )}
              <time
                className="text-[10px] text-slate-400"
                dateTime={new Date(a.updated_at ?? a.created_at).toISOString()}
                title={new Date(a.updated_at ?? a.created_at).toLocaleString()}
              >
                {relativeTime(a.updated_at ?? a.created_at)}
              </time>
            </div>
          </div>
        ))}
      </div>
      {approvals.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {showAll ? "Show fewer" : `Show all ${approvals.length}`}
        </button>
      )}
    </div>
  );
}
