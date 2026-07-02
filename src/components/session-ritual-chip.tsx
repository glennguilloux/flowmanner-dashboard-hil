"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderGit2, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type RitualData = {
  available: boolean;
  branch: string | null;
  dirty: boolean;
  changedFiles: string[];
  unpushedCount: number;
  alembicClean: boolean;
  alembicHead: string | null;
  error: string | null;
};

export function SessionRitualChip() {
  const [data, setData] = useState<RitualData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRitual = useCallback(async () => {
    try {
      const res = await apiFetch("/api/session-ritual", { cache: "no-store" });
      const d = (await res.json()) as RitualData;
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchRitual();
    function handleVisibility() {
      if (document.visibilityState === "visible") fetchRitual();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchRitual]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Summarise issues for the tooltip.
  const issues: string[] = [];
  if (data?.dirty) issues.push(`${data.changedFiles.length} uncommitted`);
  if (data && data.unpushedCount > 0)
    issues.push(`${data.unpushedCount} unpushed`);
  if (data?.alembicHead && !data.alembicClean) issues.push("pending migrations");

  const allClear = data?.available && issues.length === 0;

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
      title={
        loading
          ? "Checking FM repo..."
          : !data?.available
            ? data?.error ?? "FM repo not available"
            : allClear
              ? `${data.branch} — clean, up to date`
              : `${data?.branch ?? "?"}: ${issues.join(", ")}`
      }
    >
      <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {loading ? (
        <span className="flex items-center gap-1.5 text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking...
        </span>
      ) : !data?.available ? (
        <span className="text-slate-400">FM repo n/a</span>
      ) : (
        <>
          <span className="truncate font-medium text-slate-600 dark:text-slate-400">
            {data.branch ?? "?"}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            {allClear ? (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <>
                {data.dirty && (
                  <span
                    className="h-2 w-2 rounded-full bg-amber-500"
                    title="Uncommitted changes"
                  />
                )}
                {data.unpushedCount > 0 && (
                  <span
                    className="h-2 w-2 rounded-full bg-indigo-500"
                    title="Unpushed commits"
                  />
                )}
                {data.alembicHead && !data.alembicClean && (
                  <span
                    className="h-2 w-2 rounded-full bg-rose-500"
                    title="Pending migrations"
                  />
                )}
              </>
            )}
          </span>
        </>
      )}
    </div>
  );
}
