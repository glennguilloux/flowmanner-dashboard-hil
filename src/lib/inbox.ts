// FM Postgres reader for inbox_items + missions. We use the same connection
// pool as hil_ops (db/index.ts) but reach into the `public` schema for FM's
// own tables. Read-only — write-back (resolving inbox_items) is in phase 3.

import { sql } from "drizzle-orm";
import { db } from "@/db";

export type InboxItem = {
  id: string;
  interruptType: string;
  status: string;
  title: string;
  description: string | null;
  missionId: string | null;
  runId: string | null;
  taskId: string | null;
  nodeId: string | null;
  proposedAction: unknown;
  context: unknown;
  createdAt: string;
  expiresAt: string | null;
  resolvedAt: string | null;
};

export async function getInboxItems(): Promise<InboxItem[]> {
  const rows = await db.execute<{
    id: string;
    interrupt_type: string;
    status: string;
    title: string;
    description: string | null;
    mission_id: string | null;
    run_id: string | null;
    task_id: string | null;
    node_id: string | null;
    proposed_action: unknown;
    context: unknown;
    created_at: Date;
    expires_at: Date | null;
    resolved_at: Date | null;
  }>(sql`
    SELECT id, interrupt_type, status, title, description,
           mission_id, run_id, task_id, node_id,
           proposed_action, context,
           created_at, expires_at, resolved_at
    FROM public.inbox_items
    WHERE status = 'pending'
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return (rows as unknown as { rows: Array<Record<string, unknown>> }).rows.map(
    (r) => ({
      id: r.id as string,
      interruptType: r.interrupt_type as string,
      status: r.status as string,
      title: r.title as string,
      description: (r.description as string | null) ?? null,
      missionId: (r.mission_id as string | null) ?? null,
      runId: (r.run_id as string | null) ?? null,
      taskId: (r.task_id as string | null) ?? null,
      nodeId: (r.node_id as string | null) ?? null,
      proposedAction: r.proposed_action,
      context: r.context,
      // node-postgres returns timestamptz as a Date via the default parser, but
      // raw db.execute() can hand back a string depending on driver config.
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
      expiresAt:
        r.expires_at instanceof Date
          ? r.expires_at.toISOString()
          : r.expires_at
            ? String(r.expires_at)
            : null,
      resolvedAt:
        r.resolved_at instanceof Date
          ? r.resolved_at.toISOString()
          : r.resolved_at
            ? String(r.resolved_at)
            : null,
    }),
  );
}

export async function countInbox(): Promise<{ pending: number }> {
  const res = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count
    FROM public.inbox_items
    WHERE status = 'pending'
  `);
  const rows = (res as unknown as { rows: Array<{ count: string }> }).rows;
  return { pending: Number(rows[0]?.count ?? "0") };
}

export type Mission = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  createdAt: string;
};

export async function getMissions(filter?: {
  status?: string[];
  limit?: number;
}): Promise<Mission[]> {
  const statuses = filter?.status ?? ["running", "pending"];
  const limit = filter?.limit ?? 20;
  // Build a proper IN clause — drizzle's sql template expands arrays into
  // ($1, $2) which breaks ANY(). Using IN with sql.join is the safe path.
  const statusList = statuses.map((s) => sql`${s}`);
  const res = await db.execute<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    created_at: Date;
  }>(sql`
    SELECT id, title, status, priority, created_at
    FROM public.missions
    WHERE status IN (${sql.join(statusList, sql`, `)})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return (res as unknown as { rows: Array<Record<string, unknown>> }).rows.map(
    (r) => ({
      id: r.id as string,
      title: r.title as string,
      status: r.status as string,
      priority: (r.priority as string | null) ?? null,
      // node-postgres returns timestamptz as a Date via the default parser, but
      // raw db.execute() can hand back a string depending on driver config.
      // Handle both.
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }),
  );
}

export async function countMissions(): Promise<{
  running: number;
  pending: number;
}> {
  const res = await db.execute<{ status: string; count: string }>(sql`
    SELECT status, count(*)::text AS count
    FROM public.missions
    WHERE status IN ('running', 'pending')
    GROUP BY status
  `);
  const rows = (res as unknown as { rows: Array<{ status: string; count: string }> }).rows;
  const out = { running: 0, pending: 0 };
  for (const r of rows) {
    if (r.status === "running") out.running = Number(r.count);
    if (r.status === "pending") out.pending = Number(r.count);
  }
  return out;
}
