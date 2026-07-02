import { db } from "@/db";
import { goals, projects, strategies, tactics } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ── Goal queries ───────────────────────────────────────────────────────────

export async function getGoals(limit = 50, offset = 0) {
  const rows = await db
    .select({
      goal: goals,
      projectCount: sql<number>`count(${projects.id})::int`,
    })
    .from(goals)
    .leftJoin(projects, eq(projects.goalId, goals.id))
    .groupBy(goals.id)
    .orderBy(desc(goals.updatedAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function countGoals(): Promise<number> {
  const [row] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(goals);
  return row?.cnt ?? 0;
}

export async function getActiveGoals() {
  const rows = await db
    .select({
      goal: goals,
      projectCount: sql<number>`count(${projects.id})::int`,
    })
    .from(goals)
    .leftJoin(projects, eq(projects.goalId, goals.id))
    .where(eq(goals.status, "active"))
    .groupBy(goals.id)
    .orderBy(desc(goals.updatedAt))
    .limit(5);

  return rows;
}

export async function getGoalById(id: string) {
  const goal = await db.query.goals.findFirst({
    where: eq(goals.id, id),
  });
  if (!goal) return null;

  const [childGoals, goalProjects, linkedStrategies, linkedTactics] =
    await Promise.all([
      db
        .select()
        .from(goals)
        .where(eq(goals.parentGoalId, id))
        .orderBy(desc(goals.updatedAt)),
      db
        .select()
        .from(projects)
        .where(eq(projects.goalId, id))
        .orderBy(desc(projects.updatedAt)),
      db
        .select()
        .from(strategies)
        .where(eq(strategies.goalId, id))
        .orderBy(desc(strategies.updatedAt)),
      db
        .select()
        .from(tactics)
        .where(eq(tactics.goalId, id))
        .orderBy(desc(tactics.updatedAt)),
    ]);

  return {
    ...goal,
    milestones: childGoals,
    projects: goalProjects,
    strategies: linkedStrategies,
    tactics: linkedTactics,
  };
}

export async function createGoal(data: {
  title: string;
  description?: string;
  type?: "long-term" | "medium-term";
  category?: "do" | "schedule" | "delegate" | "eliminate" | "general";
  timeframe?: string;
  parentGoalId?: string;
  targetDate?: Date;
}) {
  const [goal] = await db
    .insert(goals)
    .values({
      title: data.title,
      description: data.description ?? "",
      type: data.type ?? "medium-term",
      category: data.category ?? "general",
      timeframe: data.timeframe ?? null,
      parentGoalId: data.parentGoalId ?? null,
      targetDate: data.targetDate ?? null,
    })
    .returning();
  return goal;
}

export async function updateGoal(
  id: string,
  data: {
    title?: string;
    description?: string;
    type?: "long-term" | "medium-term";
    category?: "do" | "schedule" | "delegate" | "eliminate" | "general";
    status?: "active" | "completed" | "archived";
    timeframe?: string;
    progress?: number;
    targetDate?: Date | null;
  },
) {
  const [goal] = await db
    .update(goals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(goals.id, id))
    .returning();
  return goal;
}

export async function deleteGoal(id: string) {
  await db.delete(goals).where(eq(goals.id, id));
}

// ── Project queries ────────────────────────────────────────────────────────

export async function getProjectsByGoal(goalId: string) {
  return db
    .select()
    .from(projects)
    .where(eq(projects.goalId, goalId))
    .orderBy(desc(projects.updatedAt));
}

export async function createProject(
  goalId: string,
  data: {
    title: string;
    description?: string;
    priority?: "critical" | "high" | "medium" | "low";
    color?: string;
    tags?: string[];
  },
) {
  const [project] = await db
    .insert(projects)
    .values({
      goalId,
      title: data.title,
      description: data.description ?? "",
      priority: data.priority ?? "medium",
      color: data.color ?? "#6366f1",
      tags: data.tags ?? [],
    })
    .returning();
  return project;
}
