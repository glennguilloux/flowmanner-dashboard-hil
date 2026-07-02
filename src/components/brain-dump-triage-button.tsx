"use client";

import { useState } from "react";
import { Brain, Loader2 } from "lucide-react";

type TriageResult = {
  processed: number;
  converted: number;
  dismissed: number;
  errors: string[];
};

type Props = {
  onTriage?: (result: TriageResult) => void;
};

export function BrainDumpTriageButton({ onTriage }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTriage() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/brain-dump/triage", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; data?: TriageResult; error?: string };

      if (!data.ok || !data.data) {
        setError(data.error ?? "Triage failed");
        return;
      }

      setResult(data.data);
      onTriage?.(data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "LLM unreachable — entries stay pending",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleTriage}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Brain className="h-4 w-4" />
        )}
        {loading ? "Triaging…" : "Triage with LLM"}
      </button>

      {result && (
        <p className="text-xs text-emerald-600">
          ✓ {result.processed} processed · {result.converted} converted ·{" "}
          {result.dismissed} dismissed
        </p>
      )}

      {error && <p className="text-xs text-rose-600">✗ {error}</p>}
    </div>
  );
}
