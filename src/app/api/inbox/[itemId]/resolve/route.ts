import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized } from "@/lib/auth";
import { resolveInboxItem } from "@/lib/fm-inbox";
import { logTacticEvent } from "@/lib/event-journal";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    decision: string;
    notes: string;
    tacticId?: string;
  };

  if (!body.decision) {
    return NextResponse.json(
      { error: "decision is required" },
      { status: 400 },
    );
  }

  const result = await resolveInboxItem(itemId, {
    decision: body.decision,
    notes: body.notes ?? "",
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 502 },
    );
  }

  // Log a tactic event if a tacticId was provided
  if (body.tacticId) {
    logTacticEvent({
      tacticId: body.tacticId,
      eventType: "completed",
      actorType: "agent",
      actorName: "Inbox Writeback",
      detail: `Inbox item ${itemId} resolved: ${body.decision}`,
    });
  }

  return NextResponse.json({ ok: true });
}
