import { db } from "@/db";
import {
  strategies,
  tactics,
  agents,
  users,
  messages,
  approvals,
} from "@/db/schema";
import { eq, ne, desc, and, isNotNull } from "drizzle-orm";
import { countInbox, countMissions, getMissions } from "@/lib/inbox";
import { getMissionHealth } from "@/lib/missions";
import { getActiveGoals } from "@/lib/goals";
import { getPendingBrainDumpEntries, countPendingBrainDump } from "@/lib/brain-dump";
import { getRecentDecisions } from "@/lib/decisions";
import { getTopSkills, countSkills } from "@/lib/skills";

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

export type TacticsFilter = {
  source?: typeof tactics.$inferSelect.source;
  status?: typeof tactics.$inferSelect.status;
  requiresHumanApproval?: boolean;
  excludeStatus?: typeof tactics.$inferSelect.status;
  humanDecisionIsNotNull?: boolean;
};

export async function getTactics(filter?: TacticsFilter) {
  const conditions = [];

  if (filter?.source) {
    conditions.push(eq(tactics.source, filter.source));
  }
  if (filter?.status) {
    conditions.push(eq(tactics.status, filter.status));
  }
  if (filter?.requiresHumanApproval !== undefined) {
    conditions.push(eq(tactics.requiresHumanApproval, filter.requiresHumanApproval));
  }
  if (filter?.excludeStatus) {
    conditions.push(ne(tactics.status, filter.excludeStatus));
  }
  if (filter?.humanDecisionIsNotNull) {
    conditions.push(isNotNull(tactics.humanDecision));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      tactic: tactics,
      strategy: strategies,
      agent: agents,
    })
    .from(tactics)
    .leftJoin(strategies, eq(tactics.strategyId, strategies.id))
    .leftJoin(agents, eq(tactics.agentId, agents.id))
    .where(where)
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

export async function getUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function getAgents() {
  return db.select().from(agents).orderBy(agents.name);
}

export async function getLastSyncTimes(): Promise<{ prs: string | null; inbox: string | null }> {
  // The sync routes create/update strategies titled "Pull Requests" and
  // "Inbox Interrupts" with updatedAt = new Date(). Use that as a proxy
  // for when the last sync ran.
  const [prStrategy] = await db
    .select({ updatedAt: strategies.updatedAt })
    .from(strategies)
    .where(eq(strategies.title, "Pull Requests"))
    .limit(1);
  const [inboxStrategy] = await db
    .select({ updatedAt: strategies.updatedAt })
    .from(strategies)
    .where(eq(strategies.title, "Inbox Interrupts"))
    .limit(1);
  return {
    prs: prStrategy?.updatedAt?.toISOString() ?? null,
    inbox: inboxStrategy?.updatedAt?.toISOString() ?? null,
  };
}

/**
 * Aggregated data fetch for the Dashboard page. Replaces the 8-query
 * `Promise.all` previously inline in `app/page.tsx` so the page can simply
 * `const data = await getDashboardData()` and destructure. The panel-specific
 * shaping (e.g. `prRows` → `prTactics` via `computeCiRollup`) stays in the
 * page because `lib/ci.ts` is a UI helper, not a data layer.
 *
 * Return type is explicit and derived from the underlying fetchers via
 * `Awaited<ReturnType<...>>` — any signature change in those fetchers
 * propagates here automatically.
 */
export async function getDashboardData(): Promise<{
  prRows: Awaited<ReturnType<typeof getTactics>>;
  needsReview: Awaited<ReturnType<typeof getTactics>>;
  resolvedTactics: Awaited<ReturnType<typeof getTactics>>;
  inbox: Awaited<ReturnType<typeof countInbox>>;
  missions: Awaited<ReturnType<typeof countMissions>>;
  missionList: Awaited<ReturnType<typeof getMissions>>;
  missionHealth: Awaited<ReturnType<typeof getMissionHealth>>;
  syncTimes: Awaited<ReturnType<typeof getLastSyncTimes>>;
  activeGoals: Awaited<ReturnType<typeof getActiveGoals>>;
  brainDumpEntries: Awaited<ReturnType<typeof getPendingBrainDumpEntries>>;
  brainDumpPending: Awaited<ReturnType<typeof countPendingBrainDump>>;
  recentDecisions: Awaited<ReturnType<typeof getRecentDecisions>>;
  topSkills: Awaited<ReturnType<typeof getTopSkills>>;
  skillCount: Awaited<ReturnType<typeof countSkills>>;
}> {
  const [prRows, needsReview, inbox, missions, missionList, missionHealth, resolvedTactics, syncTimes, activeGoals, brainDumpEntries, brainDumpPending, recentDecisions, topSkills, skillCount] =
    await Promise.all([
      getTactics({ source: "pr" }),
      getTactics({ status: "needs_review" }),
      countInbox(),
      countMissions(),
      getMissions({ limit: 5 }),
      getMissionHealth(),
      getTactics({ excludeStatus: "needs_review", humanDecisionIsNotNull: true }),
      getLastSyncTimes(),
      getActiveGoals(),
      getPendingBrainDumpEntries(),
      countPendingBrainDump(),
      getRecentDecisions(),
      getTopSkills(),
      countSkills(),
    ]);
  return {
    prRows,
    needsReview,
    inbox,
    missions,
    missionList,
    missionHealth,
    resolvedTactics,
    syncTimes,
    activeGoals,
    brainDumpEntries,
    brainDumpPending,
    recentDecisions,
    topSkills,
    skillCount,
  };
}