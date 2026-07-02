"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type MachineStatus = {
  id: string;
  name: string;
  isEnabled: boolean | null;
  isActive: boolean | null;
  isReachable: boolean;
  error: string | null;
};

type AuditEntry = {
  timestamp: string;
  actor: string;
  machineId: string;
  action: "enable" | "disable";
  result: "ok" | string;
};

type StatusResponse = {
  ok: boolean;
  machines?: MachineStatus[];
  lastSwap?: AuditEntry | null;
  latencyMs?: number;
  error?: string;
};

type Props = {
  onOpenPanel: () => void;
};

export function WgWatchdogChip({ onOpenPanel }: Props) {
  const [machines, setMachines] = useState<MachineStatus[] | null>(null);
  const [lastSwap, setLastSwap] = useState<AuditEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/api/wg-watchdog", { cache: "no-store" });
      const data = (await res.json()) as StatusResponse;
      if (data.ok && data.machines) {
        setMachines(data.machines);
        setLastSwap(data.lastSwap ?? null);
      } else {
        setMachines([]);
      }
    } catch {
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount + on tab refocus.
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

  const summary = computeAggregate(machines);

  return (
    <button
      type="button"
      onClick={onOpenPanel}
      className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
      title="Click to manage WireGuard watchdog timer"
      aria-label="Open WireGuard watchdog manager"
    >
      <ShieldCheck
        className="h-4 w-4 shrink-0 text-indigo-600"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {loading ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking WG...
          </span>
        ) : (
          <>
            <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
              WG watchdog
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {summary.label}
            </p>
            {lastSwap && (
              <p
                className="truncate text-[10px] text-slate-500 dark:text-slate-400"
                title={`${lastSwap.action} ${lastSwap.machineId} by ${lastSwap.actor}${
                  lastSwap.result === "ok" ? "" : ` — ${lastSwap.result}`
                }`}
                aria-label={`Last swap at ${lastSwap.timestamp} by ${lastSwap.actor}${
                  lastSwap.result === "ok" ? "" : `, ${lastSwap.result}`
                }`}
              >
                Last swap {formatDistanceToNow(new Date(lastSwap.timestamp), { addSuffix: true })}
                {lastSwap.actor && lastSwap.actor !== "me" ? ` · ${lastSwap.actor}` : ""}
                {lastSwap.result !== "ok" ? " · failed" : ""}
              </p>
            )}
          </>
        )}
      </div>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${summary.dot}`}
        aria-hidden="true"
      />
    </button>
  );
}

function computeAggregate(machines: MachineStatus[] | null): {
  label: string;
  dot: string;
} {
  if (!machines || machines.length === 0) {
    return { label: "Unreachable", dot: "bg-rose-400" };
  }
  const unreachable = machines.filter((m) => !m.isReachable).length;
  const running = machines.filter(
    (m) => m.isReachable && m.isEnabled && m.isActive,
  ).length;

  if (unreachable === machines.length) {
    return { label: "Both unreachable", dot: "bg-rose-400" };
  }
  if (running === machines.length) {
    return {
      label: `${running}/${machines.length} running`,
      dot: "bg-emerald-500",
    };
  }
  if (running === 0) {
    return { label: "Both down", dot: "bg-rose-400" };
  }
  return {
    label: `${running}/${machines.length} running`,
    dot: "bg-amber-500",
  };
}
