import { db } from "@/db";
import { tactics, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { chat } from "@/lib/llm";
import { needsGate } from "@/lib/gate";

const SYSTEM_PROMPT = `You are a risk assessor for a software operations dashboard. You evaluate tactics (proposed actions) and score their confidence and risk level.

Given a tactic's details, respond with ONLY a JSON object (no markdown, no explanation outside the JSON):

{
  "confidence": <integer 0-100>,
  "riskLevel": "<low|medium|high>",
  "reasoning": "<1-2 sentence summary of your assessment>",
  "uncertaintyNotes": "<what you're uncertain about, or null if confidence >= 70>"
}

Guidelines:
- Confidence: How likely is this tactic to succeed as intended? 100 = certain, 0 = no idea.
- Risk: low = safe, reversible, small scope. medium = moderate scope or some irreversibility. high = large scope, destructive, or hard to undo.
- For PRs: large deletions = higher risk. Test-only changes = lower risk. Failing CI = lower confidence.
- Be conservative. When in doubt, score lower confidence and higher risk.`;

export type ReviewResult = {
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  reasoning: string;
  uncertaintyNotes: string | null;
};

export function parseReviewResponse(content: string): ReviewResult | null {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (content[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        candidates.push(content.slice(start, i + 1));
        start = -1;
      }
    }
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]) as Record<string, unknown>;
      if (parsed.confidence == null && parsed.riskLevel == null) continue;
      const confidence = Math.max(0, Math.min(100, Number(parsed.confidence ?? 0)));
      const riskRaw = String(parsed.riskLevel ?? "medium").toLowerCase();
      const riskLevel = (["low", "medium", "high"].includes(riskRaw)
        ? riskRaw
        : "medium") as "low" | "medium" | "high";
      const reasoning = String(parsed.reasoning ?? "");
      const uncertaintyNotes =
        parsed.uncertaintyNotes != null && String(parsed.uncertaintyNotes).trim()
          ? String(parsed.uncertaintyNotes)
          : null;

      return { confidence, riskLevel, reasoning, uncertaintyNotes };
    } catch {
      continue;
    }
  }
  return null;
}

function buildUserPrompt(
  tactic: typeof tactics.$inferSelect,
): string {
  const parts: string[] = [
    `Title: ${tactic.title}`,
    `Description: ${tactic.description}`,
  ];

  if (tactic.steps.length > 0) {
    parts.push(`Steps: ${tactic.steps.join("; ")}`);
  }
  if (tactic.uncertaintyNotes) {
    parts.push(`Existing uncertainty notes: ${tactic.uncertaintyNotes}`);
  }

  if (tactic.source === "pr") {
    parts.push(`Source: Pull Request #${tactic.sourceId}`);
    if (tactic.ciChecks) {
      const checks = tactic.ciChecks as Array<{
        name: string;
        conclusion: string | null;
        status: string;
      }>;
      const failing = checks.filter(
        (c) =>
          c.conclusion === "FAILURE" ||
          c.conclusion === "ERROR" ||
          c.conclusion === "CANCELLED",
      );
      const passing = checks.filter((c) => c.conclusion === "SUCCESS");
      const pending = checks.filter(
        (c) =>
          c.status === "IN_PROGRESS" ||
          c.status === "QUEUED" ||
          c.status === "PENDING",
      );
      parts.push(
        `CI status: ${failing.length} failing, ${passing.length} passing, ${pending.length} pending`,
      );
      if (failing.length > 0) {
        parts.push(
          `Failing checks: ${failing.map((c) => c.name).join(", ")}`,
        );
      }
    }
    if (tactic.prMergeable) {
      parts.push(`PR mergeable: ${tactic.prMergeable}`);
    }
  }

  if (tactic.source === "inbox") {
    parts.push(`Source: Inbox interrupt #${tactic.sourceId}`);
  }

  if (tactic.riskLevel) {
    parts.push(`Current risk level: ${tactic.riskLevel}`);
  }
  parts.push(`Current confidence: ${tactic.confidence}%`);

  return parts.join("\n");
}

export type ScoredTactic = {
  tacticId: string;
  title: string;
  ok: boolean;
  confidence?: number;
  riskLevel?: string;
  reasoning?: string;
  uncertaintyNotes?: string | null;
  requiresHumanApproval?: boolean;
  tokens?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
};

/**
 * Score a single tactic via the homelab LLM. Updates the DB and inserts a
 * message recording the review. Returns a ScoredTactic result.
 */
export async function scoreTactic(
  tacticId: string,
): Promise<ScoredTactic> {
  const tactic = await db.query.tactics.findFirst({
    where: eq(tactics.id, tacticId),
  });
  if (!tactic) {
    return { tacticId, title: "", ok: false, error: "Tactic not found" };
  }

  try {
    const { content, usage } = await chat(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(tactic) },
      ],
      { maxTokens: 2048, temperature: 0.2 },
    );

    const result = parseReviewResponse(content);
    if (!result) {
      return {
        tacticId,
        title: tactic.title,
        ok: false,
        error: "LLM returned unparseable response",
      };
    }

    const requiresHumanApproval = needsGate({
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      requiresHumanApproval: false,
    });

    await db
      .update(tactics)
      .set({
        confidence: result.confidence,
        riskLevel: result.riskLevel,
        uncertaintyNotes: result.uncertaintyNotes,
        requiresHumanApproval,
        updatedAt: new Date(),
      })
      .where(eq(tactics.id, tacticId));

    const gateNote = requiresHumanApproval
      ? " ⚠ Human gate triggered."
      : " ✓ No gate needed.";
    await db.insert(messages).values({
      parentType: "tactic",
      parentId: tacticId,
      authorType: "agent",
      authorId: "00000000-0000-0000-0000-000000000000",
      authorName: "LLM Reviewer (Qwen3-27B)",
      content: [
        `Confidence: ${result.confidence}%`,
        `Risk: ${result.riskLevel}`,
        `Reasoning: ${result.reasoning}`,
        result.uncertaintyNotes
          ? `Uncertainty: ${result.uncertaintyNotes}`
          : null,
        gateNote,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return {
      tacticId,
      title: tactic.title,
      ok: true,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      reasoning: result.reasoning,
      uncertaintyNotes: result.uncertaintyNotes,
      requiresHumanApproval,
      tokens: usage,
    };
  } catch (err) {
    return {
      tacticId,
      title: tactic.title,
      ok: false,
      error: `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
