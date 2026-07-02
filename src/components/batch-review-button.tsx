"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type BatchResult = {
  total: number;
  reviewed: number;
  failed: number;
  results: Array<{
    tacticId: string;
    title: string;
    ok: boolean;
    confidence?: number;
    riskLevel?: string;
    error?: string;
  }>;
};

export function BatchReviewButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBatchReview() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiFetch("/api/review/score/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as BatchResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleBatchReview}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scoring all tactics…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Batch Review
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Batch Review Complete
          </div>
          <div className="mt-2 space-y-1 text-emerald-800">
            {result.total === 0 ? (
              <p>All tactics already scored.</p>
            ) : (
              <>
                <p>
                  <span className="font-medium">Scored:</span>{" "}
                  {result.reviewed} / {result.total}
                  {result.failed > 0 && (
                    <span className="text-rose-600">
                      {" "}
                      ({result.failed} failed)
                    </span>
                  )}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {result.results.map((r) => (
                    <li key={r.tacticId} className="flex items-center gap-2">
                      {r.ok ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-rose-500" />
                      )}
                      <span className="truncate">{r.title}</span>
                      {r.ok && (
                        <span className="ml-auto text-emerald-600">
                          {r.confidence}% · {r.riskLevel}
                        </span>
                      )}
                      {r.error && (
                        <span className="ml-auto text-rose-600 truncate max-w-[200px]">
                          {r.error}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
