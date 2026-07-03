import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

// GET — latest heartbeat per agentId (DISTINCT ON), with stale flag.
export async function GET() {
  const STALE_MINUTES = 5;

  const rows = await db.execute(sql`
    SELECT DISTINCT ON (agent_id)
      id,
      agent_id,
      status,
      task,
      progress,
      log_line,
      tone,
      created_at,
      (created_at < NOW() - INTERVAL '${sql.raw(String(STALE_MINUTES))} minutes') AS stale
    FROM hil_ops.agent_heartbeats
    ORDER BY agent_id, created_at DESC
  `);

  const heartbeats = (
    rows as unknown as { rows: Array<Record<string, unknown>> }
  ).rows.map((r) => ({
    id: r.id as string,
    agentId: r.agent_id as string,
    status: r.status as string,
    task: r.task as string,
    progress: r.progress as number | null,
    logLine: (r.log_line as string | null) ?? null,
    tone: (r.tone as string) ?? "neutral",
    createdAt: r.created_at as string,
    stale: Boolean(r.stale),
  }));

  return NextResponse.json({
    ok: true,
    data: heartbeats,
    meta: { total: heartbeats.length },
  });
}
