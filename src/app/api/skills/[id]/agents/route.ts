import { NextRequest, NextResponse } from "next/server";
import { linkSkillToAgent, unlinkSkillFromAgent } from "@/lib/skills";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: skillId } = await params;
  const body = (await request.json()) as { agentId?: string };

  if (!body.agentId?.trim()) {
    return NextResponse.json(
      { ok: false, error: "agentId is required" },
      { status: 400 },
    );
  }

  await linkSkillToAgent(skillId, body.agentId.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: skillId } = await params;
  const body = (await request.json()) as { agentId?: string };

  if (!body.agentId?.trim()) {
    return NextResponse.json(
      { ok: false, error: "agentId is required" },
      { status: 400 },
    );
  }

  await unlinkSkillFromAgent(skillId, body.agentId.trim());
  return NextResponse.json({ ok: true });
}
