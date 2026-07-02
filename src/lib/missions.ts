import { sql } from "drizzle-orm";
import { db } from "@/db";

export type MissionHealth = {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  successRate: number;
  recentFailures: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
};

export async function getMissionHealth(): Promise<MissionHealth> {
  const res = await db.execute(sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'completed')::int AS completed,
      count(*) FILTER (WHERE status = 'failed')::int AS failed,
      count(*) FILTER (WHERE status = 'running')::int AS running,
      count(*) FILTER (WHERE status = 'pending')::int AS pending
    FROM public.missions
  `);
  const row = (res as unknown as { rows: Array<Record<string, number>> }).rows[0];

  const total = row?.total ?? 0;
  const completed = row?.completed ?? 0;
  const failed = row?.failed ?? 0;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Recent failures (last 10)
  const failRes = await db.execute(sql`
    SELECT id, title, status, created_at::text
    FROM public.missions
    WHERE status = 'failed'
    ORDER BY created_at DESC
    LIMIT 10
  `);
  const failRows = (failRes as unknown as { rows: Array<Record<string, unknown>> }).rows;

  return {
    total,
    completed,
    failed,
    running: row?.running ?? 0,
    pending: row?.pending ?? 0,
    successRate,
    recentFailures: failRows.map((r) => ({
      id: r.id as string,
      title: r.title as string,
      status: r.status as string,
      createdAt: r.created_at as string,
    })),
  };
}
