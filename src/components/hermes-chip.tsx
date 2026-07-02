"use client";

import { useState, useEffect } from "react";
import { Brain } from "lucide-react";

type HealthData = {
  ok: boolean;
  error?: string;
  sessions?: number;
  jobs?: number;
};

type Props = {
  onOpenPanel: () => void;
};

export function HermesChip({ onOpenPanel }: Props) {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/hermes/health", {
          signal: AbortSignal.timeout(5_000),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          sessions?: number;
          jobs?: number;
        };
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth({ ok: false, error: "Unreachable" });
      }
    }

    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const online = health?.ok;
  const dotColor = online ? "bg-emerald-500" : health ? "bg-rose-500" : "bg-slate-300";

  return (
    <button
      type="button"
      onClick={onOpenPanel}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-violet-200 hover:bg-violet-50/50 dark:border-slate-800 dark:bg-slate-800 dark:hover:border-violet-800 dark:hover:bg-violet-950/30"
    >
      <div className="relative">
        <Brain className="h-4 w-4 text-violet-600" aria-hidden="true" />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-800 ${dotColor}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
          Hermes Agent
        </p>
        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
          {health === null
            ? "Checking…"
            : online
              ? "Connected"
              : health.error ?? "Offline"}
        </p>
      </div>
    </button>
  );
}
