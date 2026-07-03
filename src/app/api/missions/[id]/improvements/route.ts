import { NextResponse } from "next/server";
import { getMissionImprovements } from "@/lib/fm-missions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const improvements = await getMissionImprovements(id);
  return NextResponse.json({ ok: true, data: improvements });
}
