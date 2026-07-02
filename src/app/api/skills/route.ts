import { NextRequest, NextResponse } from "next/server";
import { getSkills, createSkill } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getSkills();
  return NextResponse.json({ ok: true, data });
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
