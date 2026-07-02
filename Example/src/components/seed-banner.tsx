"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedBanner() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSeed() {
    setLoading(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <p className="text-sm text-indigo-900">
        Database is empty. Load demo strategies, agents, and tactics to start.
      </p>
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
