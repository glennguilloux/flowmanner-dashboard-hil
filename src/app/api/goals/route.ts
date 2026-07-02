import { NextRequest, NextResponse } from "next/server";
import { getGoals, createGoal } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getGoals();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    type?: "long-term" | "medium-term";
    category?: "do" | "schedule" | "delegate" | "eliminate" | "general";
    timeframe?: string;
    parentGoalId?: string;
    targetDate?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json(
      { ok: false, error: "title is required" },
      { status: 400 },
    );
  }

  const goal = await createGoal({
    title: body.title.trim(),
    description: body.description,
    type: body.type,
    category: body.category,
    timeframe: body.timeframe,
    parentGoalId: body.parentGoalId,
    targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
  });

  return NextResponse.json({ ok: true, data: goal });
}
