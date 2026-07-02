"use client";

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, Plus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BrainDumpTriageButton } from "@/components/brain-dump-triage-button";

type Entry = {
  id: string;
  content: string;
  source: string;
  status: string;
  convertedToId: string | null;
  convertedToType: string | null;
  triageSummary: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export default function BrainDumpPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/brain-dump");
      const data = (await res.json()) as { ok: boolean; data: Entry[] };
      if (data.ok) setEntries(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; data?: Entry };
      if (data.ok && data.data) {
        setEntries((prev) => [data.data!, ...prev]);
        setNewContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const pending = entries.filter((e) => e.status === "pending");
  const triaged = entries.filter((e) => e.status === "triaged");
  const converted = entries.filter((e) => e.status === "converted");
  const dismissed = entries.filter((e) => e.status === "dismissed");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
          Brain Dump
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Capture quick ideas, then triage them into actionable tactics or goals.
        </p>
      </div>

      {/* Quick-add input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Capture a quick thought…"
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-600 dark:focus:ring-indigo-900/40"
        />
        <button
          type="submit"
          disabled={!newContent.trim() || submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {/* Triage controls */}
      <div className="flex items-center gap-4">
        <BrainDumpTriageButton onTriage={() => fetchEntries()} />
        <button
          type="button"
          onClick={fetchEntries}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
        <span className="text-xs text-slate-400">
          {pending.length} pending · {converted.length} converted ·{" "}
          {dismissed.length} dismissed
        </span>
      </div>

      {/* Entries list */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No entries yet. Capture your first thought above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Pending entries first */}
            {pending.length > 0 && (
              <EntryGroup title="Pending" entries={pending} />
            )}
            {triaged.length > 0 && (
              <EntryGroup title="Triaged" entries={triaged} />
            )}
            {converted.length > 0 && (
              <EntryGroup title="Converted" entries={converted} />
            )}
            {dismissed.length > 0 && (
              <EntryGroup title="Dismissed" entries={dismissed} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryGroup({
  title,
  entries,
}: {
  title: string;
  entries: Entry[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title} ({entries.length})
      </h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-slate-100 dark:border-slate-800 p-4"
          >
            <p className="text-sm text-slate-800 dark:text-slate-200">
              {entry.content}
            </p>
            {entry.triageSummary && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                🤖 {entry.triageSummary}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
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
              {entry.tags.length > 0 && (
                <span className="text-slate-300">
                  · {entry.tags.join(", ")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
