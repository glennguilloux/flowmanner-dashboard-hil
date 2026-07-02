import { NextRequest, NextResponse } from "next/server";
import { getSkills, countSkills, createSkill } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 50, 200);
  const offset = Number(sp.get("offset")) || 0;

  const [data, total] = await Promise.all([
    getSkills(limit, offset),
    countSkills(),
  ]);

  return NextResponse.json({
    ok: true,
    data,
    meta: { total, returned: data.length, limit, offset },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    content?: string;
    tags?: string[];
  };

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 },
    );
  }

  const skill = await createSkill({
    name: body.name.trim(),
    description: body.description,
    content: body.content,
    tags: body.tags,
  });

  return NextResponse.json({ ok: true, data: skill });
}
