"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, Check, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type DaemonModel = {
  id: string;
  display_name?: string;
  architecture?: string;
  quantization?: string;
  spec_type?: string;
  active?: boolean;
  healthy?: boolean;
};

type ModelsResponse = {
  ok: boolean;
  models?: DaemonModel[];
  status?: { current_model?: string; healthy?: boolean };
  error?: string;
};

type SwapState = "idle" | "activating" | "error";

export function ModelQuickSwap() {
  const [models, setModels] = useState<DaemonModel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swapState, setSwapState] = useState<SwapState>("idle");
  const [swapTarget, setSwapTarget] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending poll on unmount.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/models", { cache: "no-store" });
      const data = (await res.json()) as ModelsResponse;
      if (data.ok) {
        setModels(Array.isArray(data.models) ? data.models : []);
        setActiveId(data.status?.current_model ?? null);
        setError(null);
      } else {
        setError(data.error ?? "Failed to load models");
      }
    } catch {
      setError("Model manager unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleActivate(modelId: string) {
    setSwapState("activating");
    setSwapTarget(modelId);
    let failed = false;
    try {
      const res = await apiFetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: modelId }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        // Optimistically update, then re-fetch to confirm
        setActiveId(modelId);
        if (pollRef.current) clearTimeout(pollRef.current);
        pollRef.current = setTimeout(fetchModels, 5000);
      } else {
        failed = true;
        setSwapState("error");
        setError(data.error ?? "Activation failed");
      }
    } catch (err) {
      failed = true;
      setSwapState("error");
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      if (!failed) {
        setSwapState("idle");
        setSwapTarget(null);
      }
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            LLM Models
          </h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            LLM Models
          </h2>
        </div>
        <button
          type="button"
          onClick={fetchModels}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          Refresh
        </button>
      </div>

      {error && swapState !== "error" && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {swapState === "error" && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => { setSwapState("idle"); setError(null); }}
            className="text-xs font-medium text-rose-700 underline hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-2">
        {models.map((model) => {
          const isActive = model.active || model.id === activeId;
          const isSwapping = swapState === "activating" && swapTarget === model.id;

          return (
            <div
              key={model.id}
              className={[
                "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                isActive
                  ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 dark:bg-indigo-950/30"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {model.display_name ?? model.id}
                </p>
                {(model.architecture || model.quantization || model.spec_type) && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {[model.architecture, model.quantization, model.spec_type]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>

              {isActive ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  <Check className="h-3 w-3" />
                  Active
                </span>
              ) : (
                <button
                  type="button"
                  disabled={swapState === "activating"}
                  onClick={() => handleActivate(model.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSwapping ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      Activate
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {models.length === 0 && !error && (
        <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
          No models found in daemon config.
        </p>
      )}
    </section>
  );
}
