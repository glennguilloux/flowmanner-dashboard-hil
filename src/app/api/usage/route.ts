import { NextRequest, NextResponse } from "next/server";
import { getUsageData } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const period = (request.nextUrl.searchParams.get("period") ?? "week") as
    | "day"
    | "week"
    | "month";

  if (!["day", "week", "month"].includes(period)) {
    return NextResponse.json(
      { ok: false, error: "period must be 'day', 'week', or 'month'" },
      { status: 400 },
    );
  }

  const data = await getUsageData(period);
  return NextResponse.json({ ok: true, data });
}
