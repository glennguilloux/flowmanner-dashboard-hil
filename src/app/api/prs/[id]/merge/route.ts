import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tactics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { prMerge } from "@/lib/github";
import { isUnauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Merge a PR-tactic. CI-gated: refuses if ciState is failing or pending.
// Body must include { confirm: true } to actually execute the merge.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { confirm?: boolean };

  if (!body.confirm) {
    return NextResponse.json(
      { error: "merge requires explicit confirm: true" },
      { status: 400 },
    );
  }

  const tactic = await db.query.tactics.findFirst({ where: eq(tactics.id, id) });
  if (!tactic) {
    return NextResponse.json({ error: "Tactic not found" }, { status: 404 });
  }
  if (tactic.source !== "pr" || !tactic.sourceId) {
    return NextResponse.json(
      { error: "Only PR-tactics can be merged" },
      { status: 400 },
    );
  }

  // CI gate: refuse merge if CI is failing or pending. PR-tactics carry
  // raw ciChecks array; we recompute the state from it.
  const checks = (tactic.ciChecks as Array<{ conclusion: string | null; status: string }> | null) ?? [];
  const failing = checks.some(
    (c) =>
      c.conclusion === "FAILURE" ||
      c.conclusion === "ERROR" ||
      c.conclusion === "CANCELLED" ||
      c.conclusion === "TIMED_OUT",
  );
  const pending = checks.some(
    (c) =>
      c.status === "IN_PROGRESS" ||
      c.status === "QUEUED" ||
      c.status === "PENDING" ||
      c.status === "WAITING",
  );
  if (failing) {
    return NextResponse.json(
      { error: "CI is failing — cannot merge" },
      { status: 409 },
    );
  }
  if (pending) {
    return NextResponse.json(
      { error: "CI is running — wait for it to finish" },
      { status: 409 },
    );
  }
  if (tactic.prMergeable && tactic.prMergeable !== "MERGEABLE") {
    return NextResponse.json(
      { error: `PR is not mergeable (${tactic.prMergeable})` },
      { status: 409 },
    );
  }

  const prNumber = Number(tactic.sourceId);
  try {
    const output = await prMerge(prNumber);
    await db.transaction(async (tx) => {
      await tx
        .update(tactics)
        .set({
          status: "completed",
          humanDecision: "approve",
          updatedAt: new Date(),
        })
        .where(eq(tactics.id, id));
    });
    return NextResponse.json({ ok: true, output });
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
