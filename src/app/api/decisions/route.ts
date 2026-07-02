import { NextRequest, NextResponse } from "next/server";
import { getDecisionsPaginated } from "@/lib/decisions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 20, 100);
  const offset = Number(sp.get("offset")) || 0;

  const { data, total } = await getDecisionsPaginated({ limit, offset });

  return NextResponse.json({
    ok: true,
    data,
    meta: { total, returned: data.length, limit, offset },
  });
}
