import { db } from "@/db";
import { skills, agentSkills, agents } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

// ── Skill queries ──────────────────────────────────────────────────────────

export async function getSkills(limit = 50, offset = 0) {
  const rows = await db
    .select({
      skill: skills,
      agentCount: sql<number>`count(${agentSkills.agentId})::int`,
    })
    .from(skills)
    .leftJoin(agentSkills, eq(agentSkills.skillId, skills.id))
    .groupBy(skills.id)
    .orderBy(desc(skills.updatedAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getSkillById(id: string) {
  const skill = await db.query.skills.findFirst({
    where: eq(skills.id, id),
  });
  if (!skill) return null;

  const linkedAgents = await db
    .select({ agent: agents })
    .from(agentSkills)
    .innerJoin(agents, eq(agentSkills.agentId, agents.id))
    .where(eq(agentSkills.skillId, id))
    .orderBy(agents.name);

  return {
    ...skill,
    agents: linkedAgents.map((r) => r.agent),
  };
}

export async function createSkill(data: {
  name: string;
  description?: string;
  content?: string;
  tags?: string[];
}) {
  const [skill] = await db
    .insert(skills)
    .values({
      name: data.name,
      description: data.description ?? "",
      content: data.content ?? "",
      tags: data.tags ?? [],
    })
    .returning();
  return skill;
}

export async function updateSkill(
  id: string,
  data: {
    name?: string;
    description?: string;
    content?: string;
    tags?: string[];
  },
) {
  const [skill] = await db
    .update(skills)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(skills.id, id))
    .returning();
  return skill;
}

export async function deleteSkill(id: string) {
  await db.delete(skills).where(eq(skills.id, id));
}

export async function countSkills() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skills);
  return row?.count ?? 0;
}

export async function getTopSkills(limit = 3) {
  const rows = await db
    .select({
      skill: skills,
      agentCount: sql<number>`count(${agentSkills.agentId})::int`,
    })
    .from(skills)
    .leftJoin(agentSkills, eq(agentSkills.skillId, skills.id))
    .groupBy(skills.id)
    .orderBy(desc(skills.updatedAt))
    .limit(limit);

  return rows;
}

// ── Agent-Skill linking ────────────────────────────────────────────────────

export async function linkSkillToAgent(skillId: string, agentId: string) {
  await db
    .insert(agentSkills)
    .values({ skillId, agentId })
    .onConflictDoNothing();
}

export async function unlinkSkillFromAgent(skillId: string, agentId: string) {
  await db
    .delete(agentSkills)
    .where(
      and(
        eq(agentSkills.skillId, skillId),
        eq(agentSkills.agentId, agentId),
      ),
    );
}
