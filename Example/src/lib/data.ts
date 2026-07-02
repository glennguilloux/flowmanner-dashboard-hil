import { db } from "@/db";
import {
  strategies,
  tactics,
  agents,
  users,
  messages,
  approvals,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function getDefaultUser() {
  return db.query.users.findFirst({
    where: eq(users.email, "me@pr-ops.local"),
  });
}

export async function getStrategies() {
  return db.select().from(strategies).orderBy(desc(strategies.updatedAt));
}

export async function getStrategyWithTactics(id: string) {
  const strategy = await db.query.strategies.findFirst({
    where: eq(strategies.id, id),
  });
  if (!strategy) return null;

  const tacticRows = await db
    .select({
      tactic: tactics,
      agent: agents,
    })
    .from(tactics)
    .leftJoin(agents, eq(tactics.agentId, agents.id))
    .where(eq(tactics.strategyId, id))
    .orderBy(desc(tactics.createdAt));

  const strategyMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.parentId, id))
    .orderBy(messages.createdAt);

  return {
    ...strategy,
    tactics: tacticRows,
    messages: strategyMessages,
  };
}

export async function getTactics() {
  return db
    .select({
      tactic: tactics,
      strategy: strategies,
      agent: agents,
    })
    .from(tactics)
    .leftJoin(strategies, eq(tactics.strategyId, strategies.id))
    .leftJoin(agents, eq(tactics.agentId, agents.id))
    .orderBy(desc(tactics.updatedAt));
}

export async function getTacticDetail(id: string) {
  const tactic = await db.query.tactics.findFirst({
    where: eq(tactics.id, id),
  });
  if (!tactic) return null;

  const strategy = await db.query.strategies.findFirst({
    where: eq(strategies.id, tactic.strategyId),
  });

  const agent = tactic.agentId
    ? await db.query.agents.findFirst({ where: eq(agents.id, tactic.agentId) })
    : null;

  const tacticMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.parentId, id))
    .orderBy(messages.createdAt);

  const tacticApprovals = await db
    .select()
    .from(approvals)
    .where(eq(approvals.tacticId, id))
    .orderBy(desc(approvals.createdAt));

  return {
    ...tactic,
    strategy,
    agent,
    messages: tacticMessages,
    approvals: tacticApprovals,
  };
}

export async function getAgents() {
  return db.select().from(agents).orderBy(agents.name);
}

export async function getDashboardStats() {
  const [strategyCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(strategies);
  const [tacticCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tactics);
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tactics)
    .where(eq(tactics.status, "needs_review"));
  const [agentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents);

  return {
    strategies: strategyCount?.count ?? 0,
    tactics: tacticCount?.count ?? 0,
    pending: pendingCount?.count ?? 0,
    agents: agentCount?.count ?? 0,
  };
}
