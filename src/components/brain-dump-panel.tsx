import Link from "next/link";
import { Lightbulb, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { brainDump } from "@/db/schema";

type Entry = typeof brainDump.$inferSelect;

type Props = {
  entries: Entry[];
  pendingCount: number;
};

export function BrainDumpPanel({ entries, pendingCount }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Brain Dump
          </h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {pendingCount} pending
            </span>
          )}
        </div>
        <Link
          href="/brain-dump"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No entries yet. Capture a quick thought below.
          </p>
        ) : (
          entries.slice(0, 5).map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-100 dark:border-slate-800 p-3"
            >
              <p className="line-clamp-2 text-sm text-slate-800 dark:text-slate-200">
                {entry.content}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                    entry.status === "pending"
                      ? "bg-amber-50 text-amber-600"
                      : entry.status === "converted"
                        ? "bg-emerald-50 text-emerald-600"
                        : entry.status === "dismissed"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-sky-50 text-sky-600"
                  }`}
                >
                  {entry.status}
                </span>
                <span suppressHydrationWarning>
                  {formatDistanceToNow(new Date(entry.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
