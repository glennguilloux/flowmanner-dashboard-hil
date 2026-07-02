"use client";

import { useState, useEffect, useCallback } from "react";
import { Cpu, Loader2 } from "lucide-react";
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
      className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
      title="Click to change LLM model"
    >
      <Cpu className="h-4 w-4 shrink-0 text-indigo-600" />
      <div className="min-w-0 flex-1">
        {loading ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading model...
          </span>
        ) : (
          <>
            <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
              {modelName ?? "No model"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {healthy === true
                ? "● Healthy"
                : healthy === false
                  ? "○ Unreachable"
                  : "● Checking..."}
            </p>
          </>
        )}
      </div>
      {healthy === true && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      )}
      {healthy === false && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
      )}
    </button>
  );
}
