"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Play,
  Power,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type MachineStatus = {
  id: string;
  name: string;
  isEnabled: boolean | null;
  isActive: boolean | null;
  isReachable: boolean;
  error: string | null;
  recentLogs: string[] | null;
};

type StatusResponse = {
  ok: boolean;
  machines?: MachineStatus[];
  latencyMs?: number;
  error?: string;
};

type Action = "enable" | "disable";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function WgWatchdogPanel({ open, onClose }: Props) {
  const [machines, setMachines] = useState<MachineStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Per-machine in-flight toggle (independent across machines so concurrent
  // toggles on different machines don't collide). Value is the action being
  // applied; absence means idle.
  const [pending, setPending] = useState<Partial<Record<string, Action>>>({});
  const [actionError, setActionError] = useState<{
    machineId: string;
    message: string;
  } | null>(null);

  // 2-step confirm dialog state per machine
  const [confirming, setConfirming] = useState<{
    machineId: string;
    action: Action;
    machineName: string;
  } | null>(null);

  // All in-flight controllers, keyed by machineId — used to abort everything
  // on unmount without each runToggle clobbering the previous one's ref.
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiFetch("/api/wg-watchdog", { cache: "no-store" });
      const data = (await res.json()) as StatusResponse;
      if (data.ok && data.machines) {
        setMachines(data.machines);
        setFetchError(null);
      } else {
        setMachines([]);
        setFetchError(data.error ?? "Failed to load status");
      }
    } catch (err) {
      setMachines([]);
      setFetchError(
        `wg-watchdog unreachable: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open + reset confirm state + abort any in-flight toggles.
  // Capture the ref value once in the effect body so the cleanup closure
  // reads the same Map instance the effect saw (react-hooks/exhaustive-deps).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const current = controllersRef.current;
    if (open) {
      fetchStatus();
      setConfirming(null);
      setActionError(null);
      setPending({});
    }
    return () => {
      // Abort all in-flight toggles on unmount/close.
      for (const c of current.values()) c.abort();
      current.clear();
    };
  }, [open, fetchStatus]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Escape closes the panel (only when nothing is mid-toggle).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && Object.keys(pending).length === 0) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, pending]);

  async function runToggle(
    machineId: string,
    machineName: string,
    action: Action,
  ) {
    setPending((p) => ({ ...p, [machineId]: action }));
    setActionError(null);
    setConfirming(null);

    const controller = new AbortController();
    controllersRef.current.set(machineId, controller);

    try {
      const res = await apiFetch("/api/wg-watchdog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId, action }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        ok: boolean;
        machine?: MachineStatus;
        error?: string;
      };
      if (!data.ok) {
        throw new Error(data.error ?? "Toggle failed");
      }
      // Refresh on success so we show authoritative state.
      await fetchStatus();
    } catch (err) {
      if (!controller.signal.aborted) {
        setActionError({
          machineId,
          message:
            err instanceof Error ? err.message : "Toggle failed (unknown)",
        });
        // Refetch on error too — the action may have partially succeeded
        // (e.g. timer enabled but sudo failed on the start), so the truth is
        // on the wire, not in our last good state.
        await fetchStatus();
      }
    } finally {
      controllersRef.current.delete(machineId);
      setPending((p) => {
        const next = { ...p };
        delete next[machineId];
        return next;
      });
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wg-panel-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            <h2
              id="wg-panel-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              WG Watchdog
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {/* Top-level fetch error */}
          {!loading && fetchError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {fetchError}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div
              className="flex items-center justify-center gap-2 py-8 text-slate-500 dark:text-slate-400"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Reading systemd status on homelab + VPS...
            </div>
          )}

          {/* Confirm dialog — confirms a destructive toggle before commit */}
          {confirming && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {confirming.action === "enable" ? "Enable" : "Disable"} WG
                watchdog on {confirming.machineName}?
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {confirming.action === "enable"
                  ? `Runs \`sudo systemctl enable --now wg-watchdog.timer\` on ${confirming.machineName}. The timer will start now and on every boot. Telegram alerts resume.`
                  : `Runs \`sudo systemctl disable --now wg-watchdog.timer\` on ${confirming.machineName}. Timer stops immediately and won't restart on boot. Telegram alerts pause until re-enabled.`}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    runToggle(
                      confirming.machineId,
                      confirming.machineName,
                      confirming.action,
                    )
                  }
                  className={
                    confirming.action === "enable"
                      ? "rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                      : "rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                  }
                >
                  Yes, {confirming.action}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="rounded-lg bg-white dark:bg-slate-900 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Machine rows */}
          {!loading && machines && machines.length > 0 && (
            <div className="space-y-3">
              {machines.map((m) => {
                const isPending = pending[m.id] !== undefined;
                const currentAction = pending[m.id] ?? null;
                const machineActionError =
                  actionError?.machineId === m.id ? actionError.message : null;

                return (
                  <MachineRow
                    key={m.id}
                    machine={m}
                    isPending={isPending}
                    currentAction={currentAction}
                    machineActionError={machineActionError}
                    onRequestToggle={(action) =>
                      setConfirming({
                        machineId: m.id,
                        machineName: m.name,
                        action,
                      })
                    }
                  />
                );
              })}
            </div>
          )}

          {!loading && machines && machines.length === 0 && !fetchError && (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No machines configured.
            </p>
          )}

          {/* Pending banner — appears if ANY machine is mid-toggle */}
          {Object.keys(pending).length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending{" "}
              {Object.entries(pending)
                .map(([id, action]) => (
                  <code key={id}>
                    sudo systemctl {action} --now wg-watchdog.timer
                  </code>
                ))
                .reduce((acc, el, i) => {
                  if (i === 0) return [el];
                  return [...acc, <span key={`sep-${i}`}> · </span>, el];
                }, [] as React.ReactNode[])}{" "}
              over SSH...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 p-4">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading || Object.keys(pending).length > 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 disabled:opacity-50"
            aria-label="Refresh status from both machines"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
          <span className="text-xs text-slate-400">Esc to close</span>
        </div>
      </div>
    </div>
  );
}

function MachineRow({
  machine,
  isPending,
  currentAction,
  machineActionError,
  onRequestToggle,
}: {
  machine: MachineStatus;
  isPending: boolean;
  currentAction: Action | null;
  machineActionError: string | null;
  onRequestToggle: (action: Action) => void;
}) {
  const isRunning =
    machine.isReachable && machine.isEnabled === true && machine.isActive === true;
  // Three states: running, disabled (timer not enabled), stuck (enabled but
  // not active — for a .timer this means the trigger isn't firing, which
  // is a real fault, not a transient pause).
  const isDisabled = machine.isReachable && machine.isEnabled === false;
  const isStuck =
    machine.isReachable &&
    machine.isEnabled === true &&
    machine.isActive === false;

  // If unreachable, surface error and skip the toggle — no action is safe to
  // commit blindly when we can't read the result.
  if (!machine.isReachable) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {machine.name}
            </p>
            <p className="mt-1 truncate font-mono text-xs text-rose-700">
              {machine.error ?? "unreachable"}
            </p>
          </div>
          <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
        </div>
        <LogsPanel lines={machine.recentLogs} />
      </div>
    );
  }

  // Next action is "disable" when running, "enable" otherwise. When stuck
  // the operator may want to re-run enable --now (idempotent re-trigger).
  const nextAction: Action = isRunning ? "disable" : "enable";
  const buttonLabel =
    isRunning ? "Disable" : isStuck ? "Restart" : "Enable";
  const buttonIcon = isStuck ? RefreshCw : isRunning ? Power : Play;

  return (
    <div
      className={[
        "rounded-xl border p-4",
        isRunning
          ? "border-emerald-200 bg-emerald-50/60"
          : isStuck
            ? "border-amber-200 bg-amber-50/60"
            : "border-slate-200 bg-slate-50/60",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {machine.name}
            </p>
            {isRunning ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                title="Timer is enabled and active"
              >
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                Running
              </span>
            ) : isStuck ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                title="Timer is enabled but not active — likely a misconfigured OnCalendar or failed unit"
              >
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Stuck
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
                title="Timer is disabled"
              >
                <ShieldOff className="h-3 w-3" aria-hidden="true" />
                Disabled
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            enabled={String(machine.isEnabled)} · active=
            {String(machine.isActive)}
          </p>
          {machineActionError && (
            <p className="mt-1 truncate font-mono text-xs text-rose-700">
              {machineActionError}
            </p>
          )}
        </div>

        <LogsPanel lines={machine.recentLogs} />

        <button
          type="button"
          disabled={isPending}
          onClick={() => onRequestToggle(nextAction)}
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            nextAction === "enable"
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-slate-900 text-white hover:bg-slate-800",
          ].join(" ")}
          aria-label={`${buttonLabel} watchdog on ${machine.name}`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              {currentAction === "enable" ? "Enabling…" : "Disabling…"}
            </>
          ) : (
            <>
              {buttonIcon === Play ? (
                <Play className="h-3 w-3" aria-hidden="true" />
              ) : buttonIcon === Power ? (
                <Power className="h-3 w-3" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
              )}
              {buttonLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Renders the last N journalctl lines for one machine. Three states:
 *   - null  → journalctl fetch failed (typically SSH unreachable) — muted line
 *   - []    → unit exists but has no recent activity — muted line
 *   - [...] → most recent log entries, monospace, scrollable
 */
function LogsPanel({ lines }: { lines: string[] | null }) {
  if (lines === null) {
    return (
      <p className="mt-2 font-mono text-[11px] italic text-slate-400">
        Logs unavailable
      </p>
    );
  }
  if (lines.length === 0) {
    return (
      <p className="mt-2 font-mono text-[11px] italic text-slate-400">
        No recent journal activity
      </p>
    );
  }
  return (
    <pre
      className="mt-2 max-h-28 overflow-y-auto rounded-md bg-slate-900/90 p-2 font-mono text-[10px] leading-snug text-slate-200"
      aria-label="Recent systemd journal entries"
    >
      {lines.join("\n")}
    </pre>
  );
}
