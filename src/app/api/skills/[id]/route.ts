import { NextRequest, NextResponse } from "next/server";
import { getSkillById, updateSkill, deleteSkill } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const skill = await getSkillById(id);
  if (!skill) {
    return NextResponse.json(
      { ok: false, error: "Skill not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: skill });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    content?: string;
    tags?: string[];
  };

  const skill = await updateSkill(id, body);
  if (!skill) {
    return NextResponse.json(
      { ok: false, error: "Skill not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: skill });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await deleteSkill(id);
  return NextResponse.json({ ok: true });
}
