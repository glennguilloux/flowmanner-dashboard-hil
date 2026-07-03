import { NextRequest, NextResponse } from "next/server";
import { getMissionLogs } from "@/lib/fm-missions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const limit = Number(request.nextUrl.searchParams.get("limit")) || 10;
  const logs = await getMissionLogs(id, limit);
  return NextResponse.json({ ok: true, data: logs });
}
