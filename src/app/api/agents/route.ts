import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, agentSkills, skills } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const agentRows = await db
    .select()
    .from(agents)
    .orderBy(desc(agents.createdAt));

  // Fetch all agent-skill links in one query
  const links = await db
    .select({ agentId: agentSkills.agentId, skill: skills })
    .from(agentSkills)
    .innerJoin(skills, eq(agentSkills.skillId, skills.id));

  const skillMap = new Map<string, typeof skills.$inferSelect[]>();
  for (const link of links) {
    const existing = skillMap.get(link.agentId) ?? [];
    existing.push(link.skill);
    skillMap.set(link.agentId, existing);
  }

  const data = agentRows.map((agent) => ({
    ...agent,
    skills: skillMap.get(agent.id) ?? [],
  }));

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    name?: string;
    role?: string;
    model?: string;
    avatarUrl?: string;
    instructions?: string;
    capabilities?: string[];
    status?: string;
    icon?: string;
    description?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 },
    );
  }
  if (!body.role?.trim()) {
    return NextResponse.json(
      { ok: false, error: "role is required" },
      { status: 400 },
    );
  }

  const [agent] = await db
    .insert(agents)
    .values({
      name: body.name.trim(),
      role: body.role.trim(),
      model: body.model ?? null,
      avatarUrl: body.avatarUrl ?? null,
      instructions: body.instructions ?? null,
      capabilities: body.capabilities ?? [],
      status: body.status ?? "active",
      icon: body.icon ?? null,
      description: body.description ?? null,
    })
    .returning();

  return NextResponse.json({ ok: true, data: agent });
}
