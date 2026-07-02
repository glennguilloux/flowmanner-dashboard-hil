// Server-only — gathers dashboard state from Postgres for the briefing.
// Used by both /api/briefing (server-side homelab LLM call) and
// /api/briefing/data (returns JSON for the client-side OpenRouter path).

import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { BriefingData, CiState } from "@/lib/briefing-types";

export type { BriefingData, CiState };

export async function getBriefingData(): Promise<BriefingData> {
  const [prRes, missionRes, gateRes, inboxRes] = await Promise.all([
    db.execute(sql`
      SELECT title, source_id, status, confidence, risk_level,
             ci_checks::text AS ci_json,
             requires_human_approval
      FROM hil_ops.tactics
      WHERE source = 'pr'
      ORDER BY source_id
    `),
    db.execute(sql`
      SELECT status, count(*)::int AS cnt
      FROM public.missions
      WHERE status IN ('running', 'pending', 'failed')
      GROUP BY status
    `),
    db.execute(sql`
      SELECT t.id, t.title, t.risk_level, t.confidence
      FROM hil_ops.tactics t
      WHERE t.status = 'needs_review' AND t.requires_human_approval = true
      ORDER BY t.created_at DESC
      LIMIT 10
    `),
    db.execute(sql`SELECT count(*)::int AS cnt FROM public.inbox_items WHERE status = 'pending'`),
  ]);

  const prRows = (prRes as unknown as { rows: Array<Record<string, unknown>> }).rows;
  const missionRows = (missionRes as unknown as { rows: Array<{ status: string; cnt: number }> }).rows;
  const gateRows = (gateRes as unknown as { rows: Array<{ id: string; title: string; risk_level: string; confidence: number }> }).rows;
  const inboxCount = ((inboxRes as unknown as { rows: Array<{ cnt: number }> }).rows[0]?.cnt) ?? 0;

  const prs = prRows.map((r) => {
    let ciState: CiState = "none";
    let failingChecks: string[] = [];
    const ciJson = r.ci_json as string;
    if (ciJson && ciJson !== "null") {
      try {
        const checks = JSON.parse(ciJson) as Array<{ conclusion: string | null; name: string; status: string }>;
        failingChecks = checks
          .filter((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR")
          .map((c) => c.name);
        ciState = failingChecks.length > 0 ? "failing" : "passing";
      } catch { /* ignore */ }
    }
    return {
      number: r.source_id as string,
      title: r.title as string,
      status: r.status as string,
      riskLevel: r.risk_level as string,
      ciState,
      failingChecks,
      confidence: r.confidence as number,
    };
  });

  const missions = { running: 0, pending: 0, failed: 0 };
  for (const r of missionRows) {
    if (r.status === "running") missions.running = r.cnt;
    else if (r.status === "pending") missions.pending = r.cnt;
    else if (r.status === "failed") missions.failed = r.cnt;
  }

  return {
    generatedAt: new Date().toISOString(),
    prs,
    missions,
    gates: {
      pending: gateRows.length,
      items: gateRows.map((r) => ({
        id: r.id,
        title: r.title,
        riskLevel: r.risk_level,
        confidence: r.confidence,
      })),
    },
    inbox: { pending: inboxCount },
  };
}
