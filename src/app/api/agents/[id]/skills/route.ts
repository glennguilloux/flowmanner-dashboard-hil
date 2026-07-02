import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentSkills, skills } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET — list skills linked to this agent
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const linkedSkills = await db
    .select({ skill: skills })
    .from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id))
    .where(eq(agentSkills.agentId, agentId));

  return NextResponse.json({
    ok: true,
    data: linkedSkills.map((r) => r.skill),
  });
}

// POST — link a skill to this agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const body = (await request.json()) as { skillId?: string };

  if (!body.skillId?.trim()) {
    return NextResponse.json(
      { ok: false, error: "skillId is required" },
      { status: 400 },
    );
  }

  await db
    .insert(agentSkills)
    .values({ agentId, skillId: body.skillId.trim() })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

// DELETE — unlink a skill from this agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;
  const body = (await request.json()) as { skillId?: string };

  if (!body.skillId?.trim()) {
    return NextResponse.json(
      { ok: false, error: "skillId is required" },
      { status: 400 },
    );
  }

  await db
    .delete(agentSkills)
    .where(
      and(
        eq(agentSkills.agentId, agentId),
        eq(agentSkills.skillId, body.skillId.trim()),
      ),
    );

  return NextResponse.json({ ok: true });
}
