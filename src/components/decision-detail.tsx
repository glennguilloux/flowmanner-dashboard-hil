"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Props = {
  id: string;
  tacticId: string;
  tacticTitle: string;
  decision: string;
  notes: string | null;
  agentName: string | null;
  strategyTitle: string | null;
  source: string;
  createdAt: string;
};

export function DecisionDetail({
  tacticTitle,
  decision,
  notes,
  agentName,
  strategyTitle,
  source,
  createdAt,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const icon =
    decision === "approve" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : decision === "reject" ? (
      <XCircle className="h-4 w-4 text-rose-500" />
    ) : (
      <HelpCircle className="h-4 w-4 text-amber-500" />
    );

  const badge =
    decision === "approve" ? (
      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        Approved
      </span>
    ) : decision === "reject" ? (
      <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
        Rejected
      </span>
    ) : (
      <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        More info
      </span>
    );

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 transition-colors hover:border-slate-200">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {tacticTitle}
            </p>
            {badge}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
            {agentName && (
              <>
                <span>{agentName}</span>
                <span>·</span>
              </>
            )}
            <span className="capitalize">{source}</span>
            <span>·</span>
            <span suppressHydrationWarning>
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-3">
          {strategyTitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Strategy:</span> {strategyTitle}
            </p>
          )}
          {notes && (
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {notes}
            </p>
          )}
          {!notes && (
            <p className="mt-2 text-xs italic text-slate-400">
              No notes provided.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
