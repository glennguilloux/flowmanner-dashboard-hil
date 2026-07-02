import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tactics, messages } from "@/db/schema";
import { getDefaultUser, getAgents } from "@/lib/data";
import { needsGate } from "@/lib/gate";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

// Simulate an agent proposing a tactic. Source = "simulated" so it doesn't
// mix with real PRs or inbox items. sourceId is a UUID so the (source,
// sourceId) upsert key is stable and unique.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    strategyId: string;
    title: string;
    description: string;
    confidence: number;
    riskLevel: "low" | "medium" | "high";
    steps?: string[];
    sources?: { title: string; url: string }[];
    agentId?: string;
    uncertaintyNotes?: string;
  };

  if (!body.title?.trim() || !body.description?.trim() || !body.strategyId) {
    return NextResponse.json(
      { error: "strategyId, title, and description are required" },
      { status: 400 },
    );
  }

  const agentsList = await getAgents();
  const agent =
    agentsList.find((a) => a.id === body.agentId) ??
    agentsList.find((a) => a.name === "Drafter") ??
    agentsList[0];

  const requiresHumanApproval = needsGate({
    confidence: body.confidence,
    riskLevel: body.riskLevel,
    requiresHumanApproval: false,
  });

  const [tactic] = await db
    .insert(tactics)
    .values({
      strategyId: body.strategyId,
      agentId: agent?.id,
      title: body.title,
      description: body.description,
      steps: body.steps ?? [],
      sources: body.sources ?? [],
      confidence: body.confidence,
      riskLevel: body.riskLevel,
      status: requiresHumanApproval ? "needs_review" : "proposed",
      requiresHumanApproval,
      uncertaintyNotes: body.uncertaintyNotes ?? null,
      source: "simulated",
      sourceId: randomUUID(),
      attemptCount: 1,
      maxAttempts: 3,
    })
    .returning();

  if (requiresHumanApproval && tactic) {
    const user = await getDefaultUser();
    await db.insert(messages).values({
      parentType: "tactic",
      parentId: tactic.id,
      authorType: "agent",
      authorId: agent?.id ?? user?.id ?? "00000000-0000-0000-0000-000000000000",
      authorName: agent?.name ?? "Agent",
      content: `Confidence is ${body.confidence}% and risk is ${body.riskLevel}. Awaiting your approval before proceeding.`,
    });
  }

  return NextResponse.json({ ok: true, tactic });
}
