"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export function EscalationNotice({
  tacticId,
  attemptCount,
  maxAttempts,
}: {
  tacticId: string;
  attemptCount: number;
  maxAttempts: number;
}) {
  const [reset, setReset] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/tactics/${tacticId}/reset-attempts`, {
          method: "POST",
        });
        const data = (await res.json()) as { ok: boolean };
        if (data.ok) {
          setReset(true);
        }
      } catch {
        // Silently fail — user can retry
      }
    });
  }

  if (reset) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
          <RotateCcw className="h-4 w-4" />
          Attempts reset
        </div>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
          The attempt counter has been reset. The tactic can be retried.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-rose-900 dark:text-rose-100">
          <AlertTriangle className="h-4 w-4" />
          Escalated — max attempts ({maxAttempts}) reached
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950/80"
        >
          <RotateCcw className="h-3 w-3" />
          {isPending ? "Resetting…" : "Reset attempts"}
        </button>
      </div>
      <p className="mt-2 text-sm text-rose-800 dark:text-rose-200">
        This tactic has been escalated for human review after exhausting all{" "}
        {maxAttempts} automated attempts. Review the tactic and reset the
        counter to allow retries.
      </p>
    </div>
  );
}
