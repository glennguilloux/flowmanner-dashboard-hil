import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized } from "@/lib/auth";
import { getTacticEvents } from "@/lib/event-journal";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await getTacticEvents(id);

  return NextResponse.json({
    ok: true,
    data: events,
    meta: { total: events.length },
  });
}
