import type { strategies, tactics } from "@/db/schema";

type StrategyStatus = (typeof strategies.$inferSelect)["status"];
type TacticStatus = (typeof tactics.$inferSelect)["status"];

const strategyStyles: Record<string, string> = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-sky-100 text-sky-700",
};

const tacticStyles: Record<string, string> = {
  proposed: "bg-slate-100 dark:bg-slate-800 text-slate-700",
  needs_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  running: "bg-indigo-100 text-indigo-700",
  completed: "bg-sky-100 text-sky-700",
};

export function StatusBadge({
  status,
  kind = "tactic",
}: {
  status: string;
  kind?: "tactic" | "strategy";
}) {
  const map = kind === "strategy" ? strategyStyles : tacticStyles;
  return (
    <span
      className={[
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        map[status] ?? "bg-slate-100 dark:bg-slate-800 text-slate-700",
      ].join(" ")}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  return (
    <span
      aria-label={`${value}% confidence`}
      className={[
        "rounded-full px-2 py-1 text-xs font-medium",
        value >= 70
          ? "bg-emerald-100 text-emerald-700"
          : value >= 40
            ? "bg-amber-100 text-amber-700"
            : "bg-rose-100 text-rose-700",
      ].join(" ")}
    >
      {value}% confidence
    </span>
  );
}

export function RiskBadge({ value }: { value: "low" | "medium" | "high" }) {
  return (
    <span
      aria-label={`Risk level: ${value}`}
      className={[
        "rounded-full px-2 py-1 text-xs font-medium capitalize",
        value === "high"
          ? "bg-rose-100 text-rose-700"
          : value === "medium"
            ? "bg-amber-100 text-amber-700"
            : "bg-emerald-100 text-emerald-700",
      ].join(" ")}
    >
      {value} risk
    </span>
  );
}

export type { StrategyStatus, TacticStatus };