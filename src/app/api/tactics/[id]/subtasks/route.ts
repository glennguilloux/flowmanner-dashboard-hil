import { NextRequest, NextResponse } from "next/server";
import {
  getSubtasks,
  createSubtask,
} from "@/lib/tactic-details";

export const dynamic = "force-dynamic";

// GET — list subtasks for a tactic
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const subtasks = await getSubtasks(id);
  return NextResponse.json({ ok: true, data: subtasks });
}

// POST — create a new subtask
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    order?: number;
  };

  if (!body.title?.trim()) {
    return NextResponse.json(
      { ok: false, error: "title is required" },
      { status: 400 },
    );
  }

  const subtask = await createSubtask(id, body.title.trim(), body.order ?? 0);
  return NextResponse.json({ ok: true, data: subtask });
}
