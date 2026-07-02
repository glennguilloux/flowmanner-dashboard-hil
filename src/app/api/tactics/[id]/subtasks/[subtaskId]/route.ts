import { NextRequest, NextResponse } from "next/server";
import { updateSubtask, deleteSubtask } from "@/lib/tactic-details";

export const dynamic = "force-dynamic";

// PATCH — update a subtask (title, done, order)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> },
) {
  const { subtaskId } = await params;
  const body = (await request.json()) as {
    title?: string;
    done?: boolean;
    order?: number;
  };

  const updates: { title?: string; done?: boolean; order?: number } = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.done !== undefined) updates.done = body.done;
  if (body.order !== undefined) updates.order = body.order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No fields to update" },
      { status: 400 },
    );
  }

  const subtask = await updateSubtask(subtaskId, updates);
  return NextResponse.json({ ok: true, data: subtask });
}

// DELETE — remove a subtask
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> },
) {
  const { subtaskId } = await params;
  await deleteSubtask(subtaskId);
  return NextResponse.json({ ok: true });
}
