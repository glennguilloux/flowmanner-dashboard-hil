import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, agentSkills, skills } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, id),
  });
  if (!agent) {
    return NextResponse.json(
      { ok: false, error: "Agent not found" },
      { status: 404 },
    );
  }

  // Fetch linked skills
  const linkedSkills = await db
    .select({ skill: skills })
    .from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id))
    .where(eq(agentSkills.agentId, id));

  return NextResponse.json({
    ok: true,
    data: { ...agent, skills: linkedSkills.map((r) => r.skill) },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    role?: string;
    model?: string | null;
    avatarUrl?: string | null;
    instructions?: string | null;
    capabilities?: string[];
    status?: string;
    icon?: string | null;
    description?: string | null;
  };

  const [agent] = await db
    .update(agents)
    .set(body)
    .where(eq(agents.id, id))
    .returning();

  if (!agent) {
    return NextResponse.json(
      { ok: false, error: "Agent not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, data: agent });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.delete(agents).where(eq(agents.id, id));
  return NextResponse.json({ ok: true });
}
