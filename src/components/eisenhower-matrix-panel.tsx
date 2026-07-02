import Link from "next/link";
import { Grid2x2, ArrowRight } from "lucide-react";
import { getQuadrantCounts } from "@/lib/priority-matrix";

const quadrants = [
  {
    key: "do" as const,
    label: "Do",
    subtitle: "Important + Urgent",
    color: "bg-rose-50 border-rose-200 text-rose-700",
    darkColor: "dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300",
    accent: "text-rose-600",
  },
  {
    key: "schedule" as const,
    label: "Schedule",
    subtitle: "Important + Not Urgent",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    darkColor: "dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
    accent: "text-amber-600",
  },
  {
    key: "delegate" as const,
    label: "Delegate",
    subtitle: "Not Important + Urgent",
    color: "bg-sky-50 border-sky-200 text-sky-700",
    darkColor: "dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300",
    accent: "text-sky-600",
  },
  {
    key: "eliminate" as const,
    label: "Eliminate",
    subtitle: "Not Important + Not Urgent",
    color: "bg-slate-50 border-slate-200 text-slate-600",
    darkColor: "dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
    accent: "text-slate-500",
  },
];

export async function EisenhowerMatrixPanel() {
  const counts = await getQuadrantCounts();
  const total = counts.do + counts.schedule + counts.delegate + counts.eliminate;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid2x2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Priority Matrix
          </h2>
          {total > 0 && (
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              {total}
            </span>
          )}
        </div>
        <Link
          href="/priority-matrix"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View matrix
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {quadrants.map((q) => (
          <div
            key={q.key}
            className={`rounded-xl border p-3 ${q.color} ${q.darkColor}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {q.label}
              </span>
              <span className={`text-lg font-bold ${q.accent}`}>
                {counts[q.key]}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] opacity-70">{q.subtitle}</p>
          </div>
        ))}
      </div>

      {counts.unclassified > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {counts.unclassified} tactic{counts.unclassified === 1 ? "" : "s"}{" "}
          not yet classified
        </p>
      )}
    </section>
  );
}
