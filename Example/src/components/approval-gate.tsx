"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { tactics } from "@/db/schema";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

type Tactic = typeof tactics.$inferSelect;

export function ApprovalGate({
  tactic,
}: {
  tactic: Tactic & { strategy?: { title: string } | null };
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "reject" | "request_more_info">("approve");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!tactic.requiresHumanApproval && tactic.status !== "needs_review") {
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`/api/tactics/${tactic.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-6">
      <div className="flex items-center gap-2 text-amber-900">
        <HelpCircle className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Human decision gate</h2>
      </div>
      <p className="mt-2 text-sm text-amber-800">
        This tactic has low confidence or elevated risk. Review the conclusion,
        sources, and uncertainties before deciding.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <DecisionOption
            label="Approve"
            icon={<CheckCircle2 className="h-4 w-4" />}
            selected={decision === "approve"}
            onSelect={() => setDecision("approve")}
          />
          <DecisionOption
            label="Reject"
            icon={<XCircle className="h-4 w-4" />}
            selected={decision === "reject"}
            onSelect={() => setDecision("reject")}
          />
          <DecisionOption
            label="Request more evidence"
            icon={<HelpCircle className="h-4 w-4" />}
            selected={decision === "request_more_info"}
            onSelect={() => setDecision("request_more_info")}
          />
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes or conditions for the agent..."
          rows={3}
          className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          Submit decision
        </button>
      </form>
    </div>
  );
}

function DecisionOption({
  label,
  icon,
  selected,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
        selected
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : "border-amber-200 bg-white text-slate-700 hover:border-amber-300",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
