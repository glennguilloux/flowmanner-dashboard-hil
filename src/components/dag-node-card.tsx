import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import type { DagNodeData } from "@/lib/dag-layout";

const STATUS_COLOR: Record<string, string> = {
  completed: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
  approved: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
  running: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
  needs_review: "border-amber-500 bg-amber-50 dark:bg-amber-900/20",
  proposed: "border-slate-300 bg-slate-50 dark:bg-slate-800",
  rejected: "border-rose-500 bg-rose-50 dark:bg-rose-900/20",
  failed: "border-rose-500 bg-rose-50 dark:bg-rose-900/20",
};

const STATUS_BAR: Record<string, string> = {
  completed: "bg-emerald-500",
  approved: "bg-emerald-500",
  running: "bg-blue-500",
  needs_review: "bg-amber-500",
  proposed: "bg-slate-400",
  rejected: "bg-rose-500",
  failed: "bg-rose-500",
};

const RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-rose-100 text-rose-700",
};

export function DagNodeCard({ data, selected }: NodeProps) {
  const d = data as unknown as DagNodeData;
  const borderClass = STATUS_COLOR[d.status] ?? STATUS_COLOR.proposed;
  const barClass = STATUS_BAR[d.status] ?? STATUS_BAR.proposed;

  return (
    <div
      className={`w-[200px] rounded-lg border-2 ${borderClass} ${
        selected ? "ring-2 ring-indigo-500 ring-offset-2" : ""
      } shadow-sm transition-shadow hover:shadow-md`}
    >
      {/* Status color bar */}
      <div className={`h-1 rounded-t-md ${barClass}`} />

      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          {d.label}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {d.confidence}%
          </span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              RISK_BADGE[d.riskLevel] ?? RISK_BADGE.medium
            }`}
          >
            {d.riskLevel}
          </span>
        </div>

        {d.agentName && (
          <p className="mt-1 truncate text-[10px] text-slate-400">
            {String(d.agentName)}
          </p>
        )}
      </div>

      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}
