"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type ReviewResult = {
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
  uncertaintyNotes: string | null;
  requiresHumanApproval: boolean;
  tokens?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

export function LlmReviewButton({ tacticId }: { tacticId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReview() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await apiFetch(`/api/review/score/${tacticId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as ReviewResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleReview}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scoring with LLM...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Review with LLM
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
            LLM Review Complete
          </div>
          <div className="mt-2 space-y-1 text-emerald-800">
            <p>
              <span className="font-medium">Confidence:</span>{" "}
              {result.confidence}%
            </p>
            <p>
              <span className="font-medium">Risk:</span>{" "}
              {result.riskLevel}
            </p>
            <p>
              <span className="font-medium">Reasoning:</span>{" "}
              {result.reasoning}
            </p>
            {result.uncertaintyNotes && (
              <p>
                <span className="font-medium">Uncertainty:</span>{" "}
                {result.uncertaintyNotes}
              </p>
            )}
            {result.requiresHumanApproval && (
              <p className="font-medium text-amber-700">
                ⚠ Human gate triggered by this review
              </p>
            )}
          </div>
          {result.tokens && (
            <p className="mt-2 text-xs text-emerald-600">
              {result.tokens.total_tokens} tokens used
            </p>
          )}
        </div>
      )}
    </div>
  );
}
