"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

// Separate from ApprovalGate because merge is an irreversible destructive
// action gated by CI state. Two clicks: arm, then confirm. Only enabled
// when ciState === "passing" AND prMergeable !== "CONFLICTING".
export function PrMergeButton({
  tacticId,
  disabled,
  disabledReason,
}: {
  tacticId: string;
  disabled: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMerge() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/prs/${tacticId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setArmed(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!armed) {
    return (
      <div>
        <button
          type="button"
          disabled={disabled}
          title={disabledReason}
          aria-label="Approve and merge this pull request"
          onClick={() => setArmed(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <GitMerge className="h-4 w-4" />
          Approve &amp; merge
        </button>
        {disabled && disabledReason && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{disabledReason}</p>
        )}
      </div>
    );
  }

  return (
    <div role="dialog" aria-label="Confirm merge" className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
      <p className="text-sm font-semibold text-emerald-900">
        Confirm squash-merge to {`${process.env.NEXT_PUBLIC_GH_REPO ?? "glennguilloux/flowmanner"}`}?
      </p>
      <p className="mt-1 text-xs text-emerald-800">
        This will close the PR and delete the head branch. Cannot be undone from here.
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleMerge}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}
          Yes, squash-merge now
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          disabled={submitting}
          className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
