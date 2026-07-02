import { NextResponse } from "next/server";
import { db } from "@/db";
import { tactics } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { isUnauthorized } from "@/lib/auth";
import { scoreTactic, escalateExhaustedTactics, type ScoredTactic } from "@/lib/review";

export const dynamic = "force-dynamic";

/**
 * POST /api/review/score/batch
 *
 * Finds all tactics with confidence = 0 (the sync default) that are not
 * simulated, then scores each one via the homelab LLM. Processes them
 * sequentially to avoid overloading the model.
 *
 * Returns { total, reviewed, failed, skipped, results }.
 */
export async function POST(_request: Request) {
  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find unscored tactics: confidence at sync default (0), non-simulated.
  const allUnscored = await db
    .select({ id: tactics.id, title: tactics.title })
    .from(tactics)
    .where(
      and(
        eq(tactics.confidence, 0),
        ne(tactics.source, "simulated"),
      ),
    );

  if (allUnscored.length === 0) {
    return NextResponse.json({
      total: 0,
      reviewed: 0,
      failed: 0,
      skipped: 0,
      results: [],
    });
  }

  // Process sequentially — the homelab LLM can't handle heavy concurrency.
  const results: ScoredTactic[] = [];
  let reviewed = 0;
  let failed = 0;

  for (const t of allUnscored) {
    const result = await scoreTactic(t.id);
    results.push(result);
    if (result.ok) {
      reviewed++;
    } else {
      failed++;
    }
  }

  // Auto-escalate any tactics where attemptCount >= maxAttempts.
  const escalated = await escalateExhaustedTactics();

  return NextResponse.json({
    total: allUnscored.length,
    reviewed,
    failed,
    escalated,
    results,
  });
}
