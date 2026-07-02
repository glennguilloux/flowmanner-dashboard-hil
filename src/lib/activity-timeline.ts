// Activity timeline data fetcher. Queries recent approvals, tactic status
// changes, and mission events from the DB, then merge-sorts them into a
// unified TimelineEvent[] for the dashboard panel. Inspired by Claude OS's
// session insights / real-time learning features.

import { db } from "@/db";
import { approvals, tactics, agents } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export type TimelineEventType =
  | "approval"
  | "rejection"
  | "tactic_completed"
  | "tactic_needs_review"
  | "mission_event"
  | "brain_dump_triaged"
  | "goal_completed"
  | "decision_requested";

type IconType = "check" | "x" | "clock" | "activity" | "shield" | "lightbulb" | "target" | "scale";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: Date;
  /** Relative link for the event (e.g. /tactics/{id}). */
  href: string;
  /** Icon name — mapped in the component. */
  icon: IconType;
};

// ── Fetchers ───────────────────────────────────────────────────────────────

// Extended event types for Phase 3: brain dump triage, goal completion,
// and decision requests extend the base timeline without new tables.

async function getRecentBrainDumpTriaged(limit: number): Promise<TimelineEvent[]> {
  const { brainDump } = await import("@/db/schema");
  const rows = await db
    .select({
      id: brainDump.id,
      content: brainDump.content,
      status: brainDump.status,
      triageSummary: brainDump.triageSummary,
      updatedAt: brainDump.updatedAt,
    })
    .from(brainDump)
    .where(sql`${brainDump.status} IN ('triaged', 'converted', 'dismissed')`)
    .orderBy(desc(brainDump.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: `braindump-${r.id}`,
    type: "brain_dump_triaged" as const,
    title: `Brain dump triaged: ${r.content.slice(0, 60)}${r.content.length > 60 ? "…" : ""}`,
    description: r.triageSummary ?? `Status: ${r.status}`,
    timestamp: new Date(r.updatedAt),
    href: "/brain-dump",
    icon: "lightbulb" as const,
  }));
}

async function getRecentGoalCompleted(limit: number): Promise<TimelineEvent[]> {
  const { goals } = await import("@/db/schema");
  const rows = await db
    .select({
      id: goals.id,
      title: goals.title,
      status: goals.status,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .where(eq(goals.status, "completed"))
    .orderBy(desc(goals.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: `goal-${r.id}`,
    type: "goal_completed" as const,
    title: `Goal completed: ${r.title}`,
    description: "Strategic objective reached",
    timestamp: new Date(r.updatedAt),
    href: `/goals/${r.id}`,
    icon: "target" as const,
  }));
}

type ApprovalRow = {
  id: string;
  decision: string;
  notes: string | null;
  createdAt: Date;
  tacticId: string;
  // leftJoin — nullable when the tactic was deleted.
  tacticTitle: string | null;
};

type TacticRow = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  agentName: string | null;
};

type MissionRow = {
  id: string;
  title: string;
  status: string;
  // Raw SQL alias matches the column name, not Drizzle camelCase.
  created_at: string;
};

async function getRecentApprovals(limit: number): Promise<TimelineEvent[]> {
  const rows = await db
    .select({
      id: approvals.id,
      decision: approvals.decision,
      notes: approvals.notes,
      createdAt: approvals.createdAt,
      tacticId: approvals.tacticId,
      tacticTitle: tactics.title,
    })
    .from(approvals)
    .leftJoin(tactics, eq(approvals.tacticId, tactics.id))
    .orderBy(desc(approvals.createdAt))
    .limit(limit);

  return rows.map((r: ApprovalRow) => {
    const title = r.tacticTitle ?? "Deleted tactic";
    return {
      id: `approval-${r.id}`,
      type: r.decision === "reject" ? "rejection" : "approval",
      title:
        r.decision === "approve"
          ? `Approved: ${title}`
          : r.decision === "reject"
            ? `Rejected: ${title}`
            : `Requested more info: ${title}`,
      description: r.notes ?? (r.decision === "approve" ? "Approved" : "Decision recorded"),
      timestamp: new Date(r.createdAt),
      href: `/tactics/${r.tacticId}`,
      icon: r.decision === "approve" ? "check" : r.decision === "reject" ? "x" : "clock",
    };
  });
}

async function getRecentTacticUpdates(limit: number): Promise<TimelineEvent[]> {
  const rows = await db
    .select({
      id: tactics.id,
      title: tactics.title,
      status: tactics.status,
      updatedAt: tactics.updatedAt,
      agentName: agents.name,
    })
    .from(tactics)
    .leftJoin(agents, eq(tactics.agentId, agents.id))
    .orderBy(desc(tactics.updatedAt))
    .limit(limit);

  return rows
    .filter((r: TacticRow) =>
      r.status === "completed" || r.status === "needs_review",
    )
    .map((r: TacticRow) => ({
      id: `tactic-${r.id}-${r.status}`,
      type:
        r.status === "completed"
          ? "tactic_completed"
          : "tactic_needs_review",
      title:
        r.status === "completed"
          ? `Completed: ${r.title}`
          : `Needs review: ${r.title}`,
      description: r.agentName ? `by ${r.agentName}` : "Updated",
      timestamp: new Date(r.updatedAt),
      href: `/tactics/${r.id}`,
      icon: r.status === "completed" ? "check" : "shield",
    }));
}

async function getRecentMissionEvents(limit: number): Promise<TimelineEvent[]> {
  // Missions live in the public schema — use raw SQL like missions.ts does.
  const res = await db.execute(sql`
    SELECT id, title, status, created_at::text
    FROM public.missions
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  const rows = (res as unknown as { rows: MissionRow[] }).rows;

  return rows.map((r) => ({
    id: `mission-${r.id}`,
    type: "mission_event" as const,
    title: `Mission: ${r.title}`,
    description: `Status: ${r.status}`,
    timestamp: new Date(r.created_at),
    href: "/",
    icon: "activity" as const,
  }));
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getRecentActivity(
  limit = 15,
): Promise<TimelineEvent[]> {
  const [approvals, tacticUpdates, missionEvents, brainDumpTriaged, goalCompleted] = await Promise.all([
    getRecentApprovals(8),
    getRecentTacticUpdates(10),
    getRecentMissionEvents(8),
    getRecentBrainDumpTriaged(5),
    getRecentGoalCompleted(5),
  ]);

  // Merge, sort descending by timestamp, take the top N.
  const all = [...approvals, ...tacticUpdates, ...missionEvents, ...brainDumpTriaged, ...goalCompleted];
  all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return all.slice(0, limit);
}
