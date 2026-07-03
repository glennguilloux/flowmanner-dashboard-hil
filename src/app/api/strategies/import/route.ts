import { NextRequest, NextResponse } from "next/server";
import { isUnauthorized } from "@/lib/auth";
import { importStrategyFromYaml } from "@/lib/yaml-strategy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.text();
  if (!body.trim()) {
    return NextResponse.json({ error: "Empty YAML body" }, { status: 400 });
  }

  const strategy = await importStrategyFromYaml(body);
  if (!strategy) {
    return NextResponse.json(
      { error: "Invalid YAML — could not parse strategy" },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true, data: strategy });
}
