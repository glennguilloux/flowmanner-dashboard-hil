import { db } from "@/db";
import { tactics, strategies, agents } from "@/db/schema";
import { eq, and, ne, sql, desc } from "drizzle-orm";

export type Quadrant = "do" | "schedule" | "delegate" | "eliminate" | "unclassified";

export function classifyQuadrant(
  importance: string | null,
  urgency: string | null,
): Quadrant {
  if (importance === "important" && urgency === "urgent") return "do";
  if (importance === "important" && urgency === "not-urgent") return "schedule";
  if (importance === "not-important" && urgency === "urgent") return "delegate";
  if (importance === "not-important" && urgency === "not-urgent") return "eliminate";
  return "unclassified";
}

export type QuadrantCounts = {
  do: number;
  schedule: number;
  delegate: number;
  eliminate: number;
  unclassified: number;
};

export async function getQuadrantCounts(): Promise<QuadrantCounts> {
  const rows = await db
    .select({
      importance: tactics.importance,
      urgency: tactics.urgency,
      count: sql<number>`count(*)::int`,
    })
    .from(tactics)
    .groupBy(tactics.importance, tactics.urgency);

  const counts: QuadrantCounts = {
    do: 0,
    schedule: 0,
    delegate: 0,
    eliminate: 0,
    unclassified: 0,
  };

  for (const row of rows) {
    const quadrant = classifyQuadrant(row.importance, row.urgency);
    counts[quadrant] += row.count;
  }

  return counts;
}

export type TacticWithQuadrant = {
  tactic: typeof tactics.$inferSelect;
  strategy: typeof strategies.$inferSelect | null;
  agent: typeof agents.$inferSelect | null;
  quadrant: Quadrant;
};

export async function getTacticsByQuadrant(): Promise<TacticWithQuadrant[]> {
  const rows = await db
    .select({
      tactic: tactics,
      strategy: strategies,
      agent: agents,
    })
    .from(tactics)
    .leftJoin(strategies, eq(tactics.strategyId, strategies.id))
    .leftJoin(agents, eq(tactics.agentId, agents.id))
    .where(
      and(
        ne(tactics.status, "completed"),
        ne(tactics.status, "rejected"),
      ),
    )
    .orderBy(desc(tactics.updatedAt));

  return rows.map((row) => ({
    ...row,
    quadrant: classifyQuadrant(row.tactic.importance, row.tactic.urgency),
  }));
}
