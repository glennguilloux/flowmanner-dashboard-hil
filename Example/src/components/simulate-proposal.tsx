"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { agents } from "@/db/schema";

type Agent = typeof agents.$inferSelect;

export function SimulateProposal({
  strategyId,
  agents,
}: {
  strategyId: string;
  agents: Agent[];
}) {
  const router = useRouter();
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confidence, setConfidence] = useState(75);
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      await fetch("/api/tactics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          title: title.trim(),
          description: description.trim(),
          confidence,
          riskLevel,
          steps: ["Proposed by simulated agent loop"],
          sources: [],
          agentId,
          uncertaintyNotes:
            confidence < 70
              ? "Confidence below threshold; evidence is weak or incomplete."
              : riskLevel === "high"
              ? "High-risk claim requires human review."
              : undefined,
        }),
      });
      setTitle("");
      setDescription("");
      setConfidence(75);
      setRiskLevel("low");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const willGate = confidence < 70 || riskLevel === "high";

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6">
      <h2 className="text-lg font-semibold text-indigo-900">
        Simulate agent proposal
      </h2>
      <p className="text-sm text-indigo-700">
        Test the human-in-the-loop gate by proposing a tactic. It will pause if
        confidence is below 70% or risk is high.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700">Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Confidence ({confidence}%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">Risk level</label>
          <div className="mt-1 flex gap-2">
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setRiskLevel(level)}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  riskLevel === level
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tactic title"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What should the agent do?"
          rows={3}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
        />

        <div className="flex items-center justify-between">
          <span
            className={[
              "text-xs font-medium",
              willGate ? "text-amber-700" : "text-emerald-700",
            ].join(" ")}
          >
            {willGate
              ? "⚠️ This will pause at the human gate"
              : "✓ This will be proposed without a gate"}
          </span>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            Propose tactic
          </button>
        </div>
      </form>
    </div>
  );
}
