"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Check, Loader2, AlertTriangle, RefreshCw, Zap } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

// ---- Types ----

type DaemonModel = {
  id: string;
  display_name?: string;
  architecture?: string;
  quantization?: string;
  spec_type?: string;
  description?: string;
  active?: boolean;
  healthy?: boolean;
};

type DaemonStatus = {
  current_model?: string;
  service_status?: string;
  healthy?: boolean;
  uptime_seconds?: number;
  [key: string]: unknown;
};

type ModelsResponse = {
  ok: boolean;
  models?: DaemonModel[];
  status?: DaemonStatus;
  latencyMs?: number;
  error?: string;
};

type ActivateResponse = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

type HealthResponse = {
  ok: boolean;
  health?: { status?: string };
  latencyMs?: number;
  error?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

// ---- Swap state machine ----

type SwapPhase = "idle" | "confirming" | "activating" | "polling" | "success" | "error";

const POLL_INTERVALS = [2000, 4000, 8000, 16000];
const POLL_TIMEOUT_MS = 60_000;

export function ModelSwapPanel({ open, onClose }: Props) {
  const [models, setModels] = useState<DaemonModel[]>([]);
  const [status, setStatus] = useState<DaemonStatus | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Swap state
  const [swapPhase, setSwapPhase] = useState<SwapPhase>("idle");
  const [targetModel, setTargetModel] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiFetch("/api/models", { cache: "no-store" });
      const data = (await res.json()) as ModelsResponse;
      if (data.ok) {
        setModels(data.models ?? []);
        setStatus(data.status ?? null);
        setLatencyMs(data.latencyMs ?? null);
      } else {
        setFetchError(data.error ?? "Failed to load models");
      }
    } catch (err) {
      setFetchError(
        `Model manager unreachable at localhost:9723. Is the daemon running? (${
          err instanceof Error ? err.message : String(err)
        })`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on panel open, reset swap state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      fetchModels();
      setSwapPhase("idle");
      setSwapError(null);
      setTargetModel(null);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [open, fetchModels]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Poll for health after activation.
  useEffect(() => {
    if (swapPhase !== "polling" || !targetModel) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const startTime = Date.now();
    let attempt = 0;

    const poll = async () => {
      if (controller.signal.aborted) return;
      if (Date.now() - startTime > POLL_TIMEOUT_MS) {
        setSwapPhase("error");
        setSwapError(
          "Swap timed out after 60s. The model may still be loading — check daemon logs.",
        );
        return;
      }

      try {
        const res = await apiFetch("/api/models/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await res.json()) as HealthResponse;

        if (data.ok && data.health?.status === "ok") {
          // Health is green — verify the active model changed
          const modelsRes = await apiFetch("/api/models", {
            cache: "no-store",
            signal: controller.signal,
          });
          const modelsData = (await modelsRes.json()) as ModelsResponse;
          if (modelsData.ok && modelsData.status?.current_model) {
            setModels(modelsData.models ?? []);
            setStatus(modelsData.status ?? null);
            setLatencyMs(modelsData.latencyMs ?? null);
          }
          setSwapPhase("success");
          setSwapError(null);
          return;
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // Network error during polling — continue trying
      }

      attempt++;
      setPollAttempt(attempt);
      const delay = POLL_INTERVALS[Math.min(attempt, POLL_INTERVALS.length - 1)];
      pollTimerRef.current = setTimeout(poll, delay);
    };

    poll();
    return () => {
      controller.abort();
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [swapPhase, targetModel]);

  async function handleActivate(modelId: string) {
    setTargetModel(modelId);
    setSwapPhase("activating");
    setSwapError(null);

    try {
      const res = await apiFetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: modelId }),
      });
      const data = (await res.json()) as ActivateResponse;

      if (data.ok) {
        // Daemon accepted the request — start polling for health
        setSwapPhase("polling");
        setPollAttempt(0);
      } else {
        setSwapPhase("error");
        setSwapError(data.error ?? "Activation failed");
      }
    } catch (err) {
      setSwapPhase("error");
      setSwapError(
        `Request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  function resetAndFetch() {
    setSwapPhase("idle");
    setSwapError(null);
    setTargetModel(null);
    fetchModels();
  }

  if (!open) return null;

  const activeId = status?.current_model;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              LLM Model Manager
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* Daemon status banner */}
          {!loading && (
            <div
              className={[
                "flex items-center gap-2 rounded-xl border p-3 text-sm",
                fetchError
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              ].join(" ")}
            >
              {fetchError ? (
                <>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {fetchError}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 shrink-0" />
                  Daemon healthy
                  {latencyMs !== null && ` · ${latencyMs}ms latency`}
                  {status?.current_model &&
                    ` · Serving: ${status.current_model}`}
                </>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading models...
            </div>
          )}

          {/* Swap progress */}
          {(swapPhase === "activating" || swapPhase === "polling") && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                {swapPhase === "activating"
                  ? "Sending activation request..."
                  : `Waiting for model to load... (attempt ${pollAttempt})`}
              </div>
              <div className="mt-3 space-y-1.5">
                <Step done={swapPhase !== "activating"} label="Send activate to daemon" />
                <Step
                  done={swapPhase === "polling" && pollAttempt > 0}
                  active={swapPhase === "polling"}
                  label="Regenerating systemd override + restarting service"
                />
                <Step done={false} label="Health check passed" />
              </div>
              {swapPhase === "polling" && (
                <p className="mt-2 text-xs text-indigo-700">
                  This typically takes 10-30s. Do not close this panel.
                </p>
              )}
            </div>
          )}

          {/* Swap success */}
          {swapPhase === "success" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                <Check className="h-4 w-4" />
                Model swapped successfully!
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                Now serving: {activeId ?? targetModel}
                {latencyMs !== null && ` · ${latencyMs}ms latency`}
              </p>
              <button
                type="button"
                onClick={resetAndFetch}
                className="mt-3 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          )}

          {/* Swap error */}
          {swapPhase === "error" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-rose-900">
                <AlertTriangle className="h-4 w-4" />
                Swap failed
              </div>
              <p className="mt-1 text-xs text-rose-700">{swapError}</p>
              <button
                type="button"
                onClick={resetAndFetch}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* Confirm dialog (inline) */}
          {swapPhase === "confirming" && targetModel && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Activate {models.find((m) => m.id === targetModel)?.display_name ?? targetModel}?
              </p>
              <p className="mt-1 text-xs text-amber-800">
                This will restart llama-server with a new model. The service
                will be unavailable for 10-30 seconds during the swap.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleActivate(targetModel)}
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Yes, activate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwapPhase("idle");
                    setTargetModel(null);
                  }}
                  className="rounded-lg bg-white dark:bg-slate-900 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Model list */}
          {!loading && models.length > 0 && (
            <div className="space-y-3">
              {models.map((model) => {
                const isActive =
                  model.active || model.id === activeId;
                const isSwapInProgress =
                  swapPhase === "activating" || swapPhase === "polling";
                const isTarget = model.id === targetModel && isSwapInProgress;

                return (
                  <div
                    key={model.id}
                    className={[
                      "rounded-xl border p-4 transition-colors",
                      isActive
                        ? "border-indigo-300 bg-indigo-50/50"
                        : "border-slate-200 bg-white dark:bg-slate-900 hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {model.display_name ?? model.id}
                          </p>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              <Check className="h-3 w-3" /> Active
                            </span>
                          )}
                          {isTarget && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              <Loader2 className="h-3 w-3 animate-spin" />{" "}
                              Loading
                            </span>
                          )}
                        </div>
                        {(model.architecture || model.quantization || model.spec_type) && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {[
                              model.architecture,
                              model.quantization,
                              model.spec_type,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {model.description && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {model.description}
                          </p>
                        )}
                      </div>

                      {/* Health indicator */}
                      {model.healthy !== undefined && (
                        <span
                          className={[
                            "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                            model.healthy ? "bg-emerald-500" : "bg-rose-400",
                          ].join(" ")}
                          title={model.healthy ? "Healthy" : "Unreachable"}
                        />
                      )}
                    </div>

                    {/* Activate button */}
                    {!isActive &&
                      swapPhase !== "success" &&
                      swapPhase !== "confirming" && (
                        <button
                          type="button"
                          disabled={isSwapInProgress}
                          onClick={() => {
                            setTargetModel(model.id);
                            setSwapPhase("confirming");
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Zap className="h-3 w-3" />
                          Activate
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && models.length === 0 && !fetchError && (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No models found in the daemon configuration.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-4">
          <button
            type="button"
            onClick={fetchModels}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Helper components ----

function Step({
  done,
  active,
  label,
}: {
  done: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : active ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />
      )}
      <span
        className={
          done
            ? "text-emerald-700"
            : active
              ? "font-medium text-indigo-700"
              : "text-slate-400"
        }
      >
        {label}
      </span>
    </div>
  );
}
