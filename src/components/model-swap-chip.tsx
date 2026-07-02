"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Zap } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type ModelStatus = {
  current_model?: string;
  service_status?: string;
  healthy?: boolean;
  [key: string]: unknown;
};

type ModelsResponse = {
  ok: boolean;
  models?: Array<{
    id: string;
    display_name?: string;
    active?: boolean;
    [key: string]: unknown;
  }>;
  status?: ModelStatus;
  latencyMs?: number;
  error?: string;
};

type Props = {
  onOpenPanel: () => void;
};

export function ModelSwapChip({ onOpenPanel }: Props) {
  const [modelName, setModelName] = useState<string | null>(null);
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/api/models", { cache: "no-store" });
      const data = (await res.json()) as ModelsResponse;
      if (data.ok && data.status) {
        // Find the active model's display name from the models list.
        const activeId = data.status.current_model;
        const activeModel = data.models?.find(
          (m) => m.id === activeId || m.active,
        );
        setModelName(
          activeModel?.display_name ?? activeModel?.id ?? activeId ?? "Unknown",
        );
        setHealthy(data.status.healthy ?? null);
      } else {
        setHealthy(false);
      }
    } catch {
      setHealthy(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch model status on mount and when tab regains focus.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchStatus();
    function handleVisibility() {
      if (document.visibilityState === "visible") fetchStatus();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchStatus]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <button
      type="button"
      onClick={onOpenPanel}
      className="group flex w-full items-center gap-3 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white px-3.5 py-3 text-left transition-all hover:border-indigo-400 hover:shadow-md dark:border-indigo-800 dark:from-indigo-950/50 dark:to-slate-900 dark:hover:border-indigo-600"
      title="Click to swap LLM model"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
        <Zap className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          LLM Model
        </p>
        {loading ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </span>
        ) : (
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {modelName ?? "No model"}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {healthy === true && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        )}
        {healthy === false && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Down
          </span>
        )}
        <span className="text-[10px] text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100">
          Swap →
        </span>
      </div>
    </button>
  );
}
