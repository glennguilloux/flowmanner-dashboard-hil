import { db } from "@/db";
import { approvals, tactics, agents, strategies } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export type DecisionLogEntry = {
  id: string;
  tacticId: string;
  tacticTitle: string;
  decision: "approve" | "reject" | "request_more_info";
  notes: string | null;
  decidedBy: string | null;
  decidedByName: string | null;
  createdAt: Date;
  source: string;
  strategyTitle: string | null;
  agentName: string | null;
};

export async function getRecentDecisions(limit = 10): Promise<DecisionLogEntry[]> {
  const rows = await db
    .select({
      id: approvals.id,
      tacticId: approvals.tacticId,
      decision: approvals.decision,
      notes: approvals.notes,
      decidedBy: approvals.decidedBy,
      createdAt: approvals.createdAt,
      tacticTitle: tactics.title,
      source: tactics.source,
      strategyTitle: strategies.title,
      agentName: agents.name,
    })
    .from(approvals)
    .leftJoin(tactics, eq(approvals.tacticId, tactics.id))
    .leftJoin(strategies, eq(tactics.strategyId, strategies.id))
    .leftJoin(agents, eq(tactics.agentId, agents.id))
    .orderBy(desc(approvals.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    tacticId: r.tacticId,
    tacticTitle: r.tacticTitle ?? "Deleted tactic",
    decision: r.decision,
    notes: r.notes,
    decidedBy: r.decidedBy,
    decidedByName: null, // resolved separately if needed
    createdAt: r.createdAt,
    source: r.source ?? "unknown",
    strategyTitle: r.strategyTitle,
    agentName: r.agentName,
  }));
}

export async function getDecisionsPaginated(opts: {
  limit?: number;
  offset?: number;
  agentId?: string;
  tacticId?: string;
}): Promise<{ data: DecisionLogEntry[]; total: number }> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  // Count total
  const [countRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(approvals);
  const total = countRow?.cnt ?? 0;

  // Fetch page
  const rows = await db
    .select({
      id: approvals.id,
      tacticId: approvals.tacticId,
      decision: approvals.decision,
      notes: approvals.notes,
      decidedBy: approvals.decidedBy,
      createdAt: approvals.createdAt,
      tacticTitle: tactics.title,
      source: tactics.source,
      strategyTitle: strategies.title,
      agentName: agents.name,
    })
    .from(approvals)
    .leftJoin(tactics, eq(approvals.tacticId, tactics.id))
    .leftJoin(strategies, eq(tactics.strategyId, strategies.id))
    .leftJoin(agents, eq(tactics.agentId, agents.id))
    .orderBy(desc(approvals.createdAt))
    .limit(limit)
    .offset(offset);

  const data = rows.map((r) => ({
    id: r.id,
    tacticId: r.tacticId,
    tacticTitle: r.tacticTitle ?? "Deleted tactic",
    decision: r.decision,
    notes: r.notes,
    decidedBy: r.decidedBy,
    decidedByName: null,
    createdAt: r.createdAt,
    source: r.source ?? "unknown",
    strategyTitle: r.strategyTitle,
    agentName: r.agentName,
  }));

  return { data, total };
}
