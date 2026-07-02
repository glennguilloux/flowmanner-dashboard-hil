import { NextResponse } from "next/server";
import { db } from "@/db";
import { tactics, strategies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getOpenPrs, prTacticValues } from "@/lib/github";
import { isUnauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Pull open PRs from gh, upsert into hil_ops.tactics (source='pr'). Returns
// the list of PR-tactics that were synced.
export async function POST() {
  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prs = await getOpenPrs();

    // Find or create a "PRs" strategy to group PR-tactics under. Always
    // touch it so updatedAt reflects the latest sync (even when 0 PRs).
    const STRATEGY_TITLE = "Pull Requests";
    let strategyId: string;
    const existing = await db
      .select()
      .from(strategies)
      .where(eq(strategies.title, STRATEGY_TITLE))
      .limit(1);
    if (existing.length > 0) {
      strategyId = existing[0].id;
      // Bump updatedAt so getLastSyncTimes() reflects this sync.
      await db
        .update(strategies)
        .set({ updatedAt: new Date() })
        .where(eq(strategies.id, strategyId));
    } else {
      const [created] = await db
        .insert(strategies)
        .values({
          title: STRATEGY_TITLE,
          description: "Open PRs on the FM repo, surfaced as tactics for review.",
          goal: "Every PR gets reviewed and either merged or closed. Failing CI is a human-gate trigger.",
          rules:
            "1) Don't merge with failing CI. 2) Use --squash on merge. 3) Delete head branch on merge.",
          humanGateTriggers:
            "Failing CI, no review, reviewer requested changes, draft promoted to ready",
          status: "active",
        })
        .returning();
      strategyId = created.id;
    }

    if (prs.length === 0) {
      return NextResponse.json({
        ok: true,
        count: 0,
        prs: [],
        syncedAt: new Date().toISOString(),
      });
    }

    // Batch upsert all PRs in a single statement (instead of per-row loop).
    // Column refs in onConflictDoUpdate.set resolve to the EXISTING row
    // (no-op), so we use sql`EXCLUDED.col` to reference the new INSERT values.
    const batchValues = prs
      .map((pr) => {
        const v = prTacticValues(pr, strategyId);
        if (!v.sourceId) return null;
        return v;
      })
      .filter(Boolean) as ReturnType<typeof prTacticValues>[];

    const inserted = await db
      .insert(tactics)
      .values(batchValues)
      .onConflictDoUpdate({
        target: [tactics.source, tactics.sourceId],
        set: {
          title: sql`EXCLUDED.title`,
          description: sql`EXCLUDED.description`,
          steps: sql`EXCLUDED.steps`,
          sources: sql`EXCLUDED.sources`,
          confidence: sql`EXCLUDED.confidence`,
          riskLevel: sql`EXCLUDED.risk_level`,
          status: sql`EXCLUDED.status`,
          requiresHumanApproval: sql`EXCLUDED.requires_human_approval`,
          ciChecks: sql`EXCLUDED.ci_checks`,
          prMergeable: sql`EXCLUDED.pr_mergeable`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: tactics.id, sourceId: tactics.sourceId, status: tactics.status });

    const synced = inserted.map((r) => ({
      number: Number(r.sourceId),
      id: r.id,
      status: r.status,
    }));

    return NextResponse.json({
      ok: true,
      count: synced.length,
      synced,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Convenience: GET also triggers a sync. Useful for browser-driven refreshes.
  return POST();
}
