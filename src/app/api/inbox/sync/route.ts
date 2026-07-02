import { NextResponse } from "next/server";
import { db } from "@/db";
import { tactics, strategies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getInboxItems, type InboxItem } from "@/lib/inbox";
import { isUnauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Risk heuristic from interrupt_type. Escalations are high-stakes, approvals
// are medium, clarifications are low. This is a placeholder until the homelab
// LLM scorer reads context + proposed_action.
function riskFromType(t: string): "low" | "medium" | "high" {
  const lower = t.toLowerCase();
  if (lower.includes("escalat") || lower.includes("critical") || lower.includes("security"))
    return "high";
  if (lower.includes("approval") || lower.includes("approve") || lower.includes("deploy"))
    return "medium";
  return "low";
}

function tacticValuesFromInbox(item: InboxItem, strategyId: string) {
  const risk = riskFromType(item.interruptType);
  const proposedActionStr = item.proposedAction
    ? typeof item.proposedAction === "string"
      ? item.proposedAction
      : JSON.stringify(item.proposedAction, null, 2).slice(0, 500)
    : null;

  const contextStr = item.context
    ? typeof item.context === "string"
      ? item.context
      : JSON.stringify(item.context, null, 2).slice(0, 500)
    : null;

  const steps: string[] = [];
  if (proposedActionStr) steps.push(`Proposed: ${proposedActionStr.slice(0, 200)}`);
  if (item.missionId) steps.push(`Mission: ${item.missionId}`);
  if (item.runId) steps.push(`Run: ${item.runId}`);
  if (item.taskId) steps.push(`Task: ${item.taskId}`);

  const sources: { title: string; url: string }[] = [];
  if (item.missionId) sources.push({ title: `Mission ${item.missionId}`, url: "#" });

  // Interrupts are always gated — the agent explicitly asked for human input.
  const uncertaintyNotes = [
    contextStr ? "Context: " + contextStr.slice(0, 200) : null,
    item.expiresAt ? `Expires: ${new Date(item.expiresAt).toLocaleString()}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    strategyId,
    title: `[${item.interruptType}] ${item.title}`,
    description: item.description ?? "(no description)",
    steps,
    sources,
    confidence: 50, // placeholder until LLM scorer
    riskLevel: risk,
    status: "needs_review" as const,
    requiresHumanApproval: true,
    uncertaintyNotes: uncertaintyNotes || null,
    source: "inbox" as const,
    sourceId: item.id,
  };
}

export async function POST() {
  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getInboxItems();

    // Find or create an "Inbox" strategy.
    const STRATEGY_TITLE = "Inbox Interrupts";
    let strategyId: string;
    const existing = await db
      .select()
      .from(strategies)
      .where(eq(strategies.title, STRATEGY_TITLE))
      .limit(1);
    if (existing.length > 0) {
      strategyId = existing[0].id;
    } else {
      const [created] = await db
        .insert(strategies)
        .values({
          title: STRATEGY_TITLE,
          description: "HIL interrupts raised by FM agents during mission execution.",
          goal: "Triage every interrupt. Approve, reject, or request clarification.",
          rules: "1) Read context before deciding. 2) Escalations are high-risk.",
          humanGateTriggers: "All interrupts require human review by definition.",
          status: "active",
        })
        .returning();
      strategyId = created.id;
    }

    if (items.length === 0) {
      return NextResponse.json({
        ok: true,
        count: 0,
        synced: [],
        syncedAt: new Date().toISOString(),
      });
    }

    // Batch upsert all inbox items in a single statement (instead of per-row loop).
    const batchValues = items.map((item) => tacticValuesFromInbox(item, strategyId));

    const inserted = await db
      .insert(tactics)
      .values(batchValues)
      .onConflictDoUpdate({
        target: [tactics.source, tactics.sourceId],
        set: {
          title: sql`EXCLUDED.title`,
          description: sql`EXCLUDED.description`,
          steps: sql`EXCLUDED.steps`,
          sources: sql`EXCLUDED.sources`,
          riskLevel: sql`EXCLUDED.risk_level`,
          uncertaintyNotes: sql`EXCLUDED.uncertainty_notes`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: tactics.id, title: tactics.title, status: tactics.status });

    return NextResponse.json({
      ok: true,
      count: inserted.length,
      synced: inserted,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// GET also triggers sync (same as PR sync).
export async function GET() {
  return POST();
}
