"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

export function SeedBanner() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSeed() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/seed", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <p className="text-sm text-indigo-900">
        No real data loaded yet. <strong>Sync PRs</strong> from GitHub to get started, or load demo data below for testing.
      </p>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      <button
        onClick={handleSeed}
        disabled={loading}
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Seeding..." : "Load demo data"}
      </button>
    </div>
  );
}