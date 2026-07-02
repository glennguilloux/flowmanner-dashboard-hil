"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, CheckCircle2, Clock, GripVertical } from "lucide-react";
import { ConfidenceBadge, RiskBadge } from "@/components/status-badge";

type Tactic = {
  id: string;
  title: string;
  description: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  status: string;
  agentId: string | null;
  importance: string | null;
  urgency: string | null;
  requiresHumanApproval: boolean;
};

type TacticRow = {
  tactic: Tactic;
  strategy: { id: string; title: string } | null;
  agent: { id: string; name: string } | null;
  quadrant: string;
};

type Props = {
  initialTactics: TacticRow[];
};

const quadrantConfig = {
  do: {
    label: "Do",
    subtitle: "Important + Urgent",
    borderColor: "border-rose-200 dark:border-rose-800",
    bgColor: "bg-rose-50/50 dark:bg-rose-950/20",
    headerBg: "bg-rose-100 dark:bg-rose-900/40",
    headerText: "text-rose-700 dark:text-rose-300",
    importance: "important",
    urgency: "urgent",
  },
  schedule: {
    label: "Schedule",
    subtitle: "Important + Not Urgent",
    borderColor: "border-amber-200 dark:border-amber-800",
    bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
    headerBg: "bg-amber-100 dark:bg-amber-900/40",
    headerText: "text-amber-700 dark:text-amber-300",
    importance: "important",
    urgency: "not-urgent",
  },
  delegate: {
    label: "Delegate",
    subtitle: "Not Important + Urgent",
    borderColor: "border-sky-200 dark:border-sky-800",
    bgColor: "bg-sky-50/50 dark:bg-sky-950/20",
    headerBg: "bg-sky-100 dark:bg-sky-900/40",
    headerText: "text-sky-700 dark:text-sky-300",
    importance: "not-important",
    urgency: "urgent",
  },
  eliminate: {
    label: "Eliminate",
    subtitle: "Not Important + Not Urgent",
    borderColor: "border-slate-200 dark:border-slate-700",
    bgColor: "bg-slate-50/50 dark:bg-slate-800/50",
    headerBg: "bg-slate-100 dark:bg-slate-800",
    headerText: "text-slate-600 dark:text-slate-400",
    importance: "not-important",
    urgency: "not-urgent",
  },
};

type QuadrantKey = keyof typeof quadrantConfig;

export function PriorityMatrix({ initialTactics }: Props) {
  const [tactics, setTactics] = useState(initialTactics);
  const [moving, setMoving] = useState<string | null>(null);

  async function moveToQuadrant(tacticId: string, quadrant: QuadrantKey) {
    const config = quadrantConfig[quadrant];
    setMoving(tacticId);
    try {
      const res = await fetch(`/api/tactics/${tacticId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importance: config.importance,
          urgency: config.urgency,
        }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        setTactics((prev) =>
          prev.map((t) =>
            t.tactic.id === tacticId
              ? {
                  ...t,
                  quadrant,
                  tactic: {
                    ...t.tactic,
                    importance: config.importance,
                    urgency: config.urgency,
                  },
                }
              : t,
          ),
        );
      }
    } finally {
      setMoving(null);
    }
  }

  const grouped: Record<QuadrantKey, TacticRow[]> = {
    do: [],
    schedule: [],
    delegate: [],
    eliminate: [],
  };
  const unclassified: TacticRow[] = [];

  for (const row of tactics) {
    if (row.quadrant in grouped) {
      grouped[row.quadrant as QuadrantKey].push(row);
    } else {
      unclassified.push(row);
    }
  }

  return (
    <div className="space-y-4">
      {/* 4-quadrant grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(quadrantConfig) as QuadrantKey[]).map((key) => {
          const config = quadrantConfig[key];
          const items = grouped[key];

          return (
            <div
              key={key}
              className={`rounded-2xl border ${config.borderColor} ${config.bgColor} shadow-sm`}
            >
              <div className={`rounded-t-2xl px-4 py-3 ${config.headerBg}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${config.headerText}`}>
                    {config.label}
                  </h3>
                  <span className={`text-xs ${config.headerText} opacity-70`}>
                    {config.subtitle}
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-3">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No tactics in this quadrant
                  </p>
                ) : (
                  items.map((row) => (
                    <TacticQuadrantCard
                      key={row.tactic.id}
                      row={row}
                      currentQuadrant={key}
                      onMove={moveToQuadrant}
                      moving={moving === row.tactic.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unclassified tactics */}
      {unclassified.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Unclassified ({unclassified.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {unclassified.map((row) => (
              <TacticQuadrantCard
                key={row.tactic.id}
                row={row}
                currentQuadrant={null}
                onMove={moveToQuadrant}
                moving={moving === row.tactic.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TacticQuadrantCard({
  row,
  currentQuadrant,
  onMove,
  moving,
}: {
  row: TacticRow;
  currentQuadrant: QuadrantKey | null;
  onMove: (id: string, quadrant: QuadrantKey) => void;
  moving: boolean;
}) {
  const [showQuadrants, setShowQuadrants] = useState(false);
  const needsAttention = row.tactic.status === "needs_review";

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all ${
        needsAttention
          ? "border-amber-200 bg-white dark:bg-slate-900"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      } ${moving ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/tactics/${row.tactic.id}`}
          className="min-w-0 flex-1"
        >
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {row.tactic.title}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
            {row.tactic.description}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <StatusIcon status={row.tactic.status} />
          <button
            type="button"
            onClick={() => setShowQuadrants(!showQuadrants)}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Move to quadrant"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {row.agent && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-600 dark:text-slate-400">
            <Bot className="h-2.5 w-2.5" /> {row.agent.name}
          </span>
        )}
        <ConfidenceBadge value={row.tactic.confidence} />
        <RiskBadge value={row.tactic.riskLevel} />
      </div>

      {/* Quadrant picker dropdown */}
      {showQuadrants && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(Object.keys(quadrantConfig) as QuadrantKey[]).map((q) => {
            const config = quadrantConfig[q];
            const isCurrent = q === currentQuadrant;
            return (
              <button
                key={q}
                type="button"
                disabled={isCurrent || moving}
                onClick={() => {
                  onMove(row.tactic.id, q);
                  setShowQuadrants(false);
                }}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                  isCurrent
                    ? "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-default"
                    : "bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                → {config.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved" || status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (status === "needs_review") {
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  }
  if (status === "rejected") {
    return <AlertTriangle className="h-4 w-4 text-rose-600" />;
  }
  return <Clock className="h-4 w-4 text-slate-400" />;
}
