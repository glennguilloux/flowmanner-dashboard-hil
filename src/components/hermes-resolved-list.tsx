"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { relativeTime } from "@/lib/relative-time";
import type { HermesApproval } from "@/types/hermes";

// ── Shared resolved-approvals list ────────────────────────────────────────
// Used by both the standalone HermesApprovalPanel and the ApprovalsTab
// inside HermesPanel to avoid duplicating the same rendering logic.

type Props = {
  approvals: HermesApproval[];
  /** Max items to show before the "Show all" toggle. Default 5. */
  initialLimit?: number;
};

export function HermesResolvedList({ approvals, initialLimit = 5 }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? approvals : approvals.slice(0, initialLimit);

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
      {approvals.length > initialLimit && (
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
