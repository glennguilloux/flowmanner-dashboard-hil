import { NextResponse } from "next/server";
import { triagePendingEntries } from "@/lib/brain-dump";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await triagePendingEntries();
  return NextResponse.json({ ok: true, data: result });
}
