// Pure formatting helpers for the executive briefing prompt. No DB imports —
// safe to use in both server (Node) and client (browser) contexts.

import type { BriefingData } from "@/lib/briefing-types";

export const BRIEFING_SYSTEM_PROMPT = `You are an engineering operations analyst. You receive real-time dashboard state from a FlowManner autonomous engineering system. Your job is to synthesize this data into a DECISION BRIEF — not a summary of events, but actionable recommendations.

Format your response as:
1. PRIORITY: What is the single most important thing right now? (1-2 sentences)
2. BLOCKED: What is blocked and why? (if nothing is blocked, say "Nothing is blocked")
3. ACTION: What should the operator (Glenn) do next? Be specific. If nothing needs action, say "No action needed — everything is healthy."

Keep it under 150 words total. Be direct, no fluff. Use the data provided.`;

export function formatBriefingPrompt(data: BriefingData): string {
  const prSummary = data.prs
    .map(
      (p) =>
        `- PR #${p.number}: ${p.title} | CI: ${p.ciState}${p.failingChecks.length > 0 ? ` (${p.failingChecks.join(", ")})` : ""} | Risk: ${p.riskLevel} | Status: ${p.status} | Confidence: ${p.confidence}%`,
    )
    .join("\n");

  const gateSummary = data.gates.items
    .map((g) => `- ${g.title} (risk: ${g.riskLevel}, confidence: ${g.confidence}%)`)
    .join("\n");

  return `CURRENT DASHBOARD STATE (real data from FlowManner):

PULL REQUESTS (${data.prs.length} open):
${prSummary || "(none synced)"}

MISSIONS:
- Running: ${data.missions.running}
- Pending: ${data.missions.pending}
- Failed: ${data.missions.failed}

HUMAN GATES (${data.gates.pending} pending):
${gateSummary || "(none)"}

INBOX:
- ${data.inbox.pending} pending interrupts`;
}
