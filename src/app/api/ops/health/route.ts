import { NextResponse } from "next/server";
import { db } from "@/db";
import { tactics } from "@/db/schema";
import { sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Operational health endpoint. Returns DB connectivity status and summary
 * stats for dashboards, monitoring scripts, and uptime checks.
 *
 * GET /api/ops/health → { ok, db, stats, timestamp }
 */
export async function GET() {
  const started = Date.now();
  try {
    // Ping the database.
    await db.execute(sql`SELECT 1`);
    const dbLatencyMs = Date.now() - started;

    // Summary counts — single grouped query.
    const rows = await db
      .select({
        status: tactics.status,
        count: sql<number>`count(*)::int`,
      })
      .from(tactics)
      .groupBy(tactics.status);

    const stats: Record<string, number> = {};
    for (const r of rows) {
      stats[r.status] = r.count;
    }
    const totalTactics = rows.reduce((sum, r) => sum + r.count, 0);
    const pendingTactics = stats["needs_review"] ?? 0;

    // Last sync proxy: most recent tactic updatedAt.
    const [lastTactic] = await db
      .select({ updatedAt: tactics.updatedAt })
      .from(tactics)
      .orderBy(desc(tactics.updatedAt))
      .limit(1);

    return NextResponse.json({
      ok: true,
      db: {
        connected: true,
        latencyMs: dbLatencyMs,
      },
      stats: {
        totalTactics,
        pendingTactics,
        byStatus: stats,
        lastActivityAt: lastTactic?.updatedAt?.toISOString() ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: { connected: false, error: (err as Error).message },
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
