import { NextRequest, NextResponse } from "next/server";
import { updateGoal, deleteGoal, getGoalById } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) {
    return NextResponse.json(
      { ok: false, error: "Goal not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: goal });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    type?: "long-term" | "medium-term";
    category?: "do" | "schedule" | "delegate" | "eliminate" | "general";
    status?: "active" | "completed" | "archived";
    timeframe?: string;
    progress?: number;
    targetDate?: string | null;
  };

  const goal = await updateGoal(id, {
    ...body,
    targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
  });

  if (!goal) {
    return NextResponse.json(
      { ok: false, error: "Goal not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: goal });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteGoal(id);
  return NextResponse.json({ ok: true });
}
