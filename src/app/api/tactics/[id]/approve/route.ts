import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tactics, approvals, messages } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { isUnauthorized } from "@/lib/auth";
import { getDefaultUser } from "@/lib/data";
import {
  prApprove,
  prRequestChanges,
  prComment,
} from "@/lib/github";

export const dynamic = "force-dynamic";

// Approve / reject / request-more-evidence on a tactic.
// - PR-tactics (source='pr'): runs the corresponding `gh pr review` or
//   `gh pr comment` action in addition to the DB write.
// - Simulated / inbox tactics: just the DB write.
//
// Idempotency guard: if an identical approval was created within the last
// 5 seconds, return the existing result instead of re-running gh commands.
// This prevents double-trigger from rapid button clicks.
const IDEMPOTENCY_WINDOW_MS = 5_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    decision: "approve" | "reject" | "request_more_info";
    notes?: string;
  };

  if (!body.decision) {
    return NextResponse.json({ error: "decision is required" }, { status: 400 });
  }

  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getDefaultUser();
  if (!user) {
    return NextResponse.json({ error: "No operator found" }, { status: 400 });
  }

  const tactic = await db.query.tactics.findFirst({ where: eq(tactics.id, id) });
  if (!tactic) {
    return NextResponse.json({ error: "Tactic not found" }, { status: 404 });
  }

  // Already decided? Don't re-run side effects.
  if (tactic.status !== "needs_review" && tactic.status !== "proposed") {
    return NextResponse.json(
      { ok: true, status: tactic.status, message: "Tactic already decided" },
    );
  }

  // Idempotency: check for a recent identical approval (within the last 5s).
  // Prevents double-trigger from rapid clicks racing before the button disables.
  const recentCutoff = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  const recentApproval = await db.query.approvals.findFirst({
    where: and(
      eq(approvals.tacticId, id),
      eq(approvals.decision, body.decision),
      gte(approvals.createdAt, recentCutoff),
    ),
    orderBy: (a, { desc }) => desc(a.createdAt),
  });
  if (recentApproval) {
    return NextResponse.json({
      ok: true,
      status: tactic.status,
      message: "Duplicate request — already processed",
    });
  }

  // PR-specific action: translate the human decision to a `gh` call.
  if (tactic.source === "pr" && tactic.sourceId) {
    const prNumber = Number(tactic.sourceId);
    const noteText = body.notes ?? `via FlowManner HIL: ${body.decision}`;
    try {
      if (body.decision === "approve") {
        await prApprove(prNumber, noteText);
      } else if (body.decision === "reject") {
        await prRequestChanges(prNumber, noteText);
      } else {
        // request_more_info
        await prComment(prNumber, noteText);
      }
    } catch (err) {
      return NextResponse.json(
        {
          error: `gh pr review failed: ${err instanceof Error ? err.message : String(err)}`,
        },
        { status: 502 },
      );
    }
  }

  // Inbox-specific write-back: resolve the FM inbox_items row directly in
  // Postgres (same DB instance, public schema). This is the cleanest path
  // since FM's API returns 401 for internal tools.
  if (tactic.source === "inbox" && tactic.sourceId) {
    const inboxId = tactic.sourceId;
    const inboxStatus =
      body.decision === "approve"
        ? "approved"
        : body.decision === "reject"
          ? "rejected"
          : "pending"; // request_more_info keeps it pending
    try {
      if (body.decision === "request_more_info") {
        // Just update the resolution note, keep status pending so the agent re-reads it.
        await db.execute(sql`
          UPDATE public.inbox_items
          SET resolution_note = ${body.notes ?? null},
              updated_at = now()
          WHERE id = ${inboxId}
        `);
      } else {
        await db.execute(sql`
          UPDATE public.inbox_items
          SET status = ${inboxStatus},
              resolved_at = now(),
              resolved_by = 1,
              resolution_note = ${body.notes ?? null},
              updated_at = now()
          WHERE id = ${inboxId}
        `);
      }
    } catch (err) {
      return NextResponse.json(
        {
          error: `inbox resolve failed: ${err instanceof Error ? err.message : String(err)}`,
        },
        { status: 502 },
      );
    }
  }

  let status: (typeof tactics.$inferSelect)["status"] = "needs_review";
  if (body.decision === "approve") status = "approved";
  if (body.decision === "reject") status = "rejected";
  if (body.decision === "request_more_info") status = "needs_review";

  const label =
    body.decision === "approve"
      ? "approved"
      : body.decision === "reject"
        ? "rejected"
        : "requested more information on";

  // Wrap all DB writes in a transaction so the tactic status, approval
  // record, and message are committed atomically. External side effects
  // (gh pr review, inbox write-back) happen BEFORE this so they aren't
  // held open inside the transaction.
  await db.transaction(async (tx) => {
    await tx
      .update(tactics)
      .set({
        status,
        humanDecision: body.decision,
        updatedAt: new Date(),
      })
      .where(eq(tactics.id, id));

    await tx.insert(approvals).values({
      tacticId: id,
      decision: body.decision,
      notes: body.notes ?? null,
      decidedBy: user.id,
    });

    await tx.insert(messages).values({
      parentType: "tactic",
      parentId: id,
      authorType: "human",
      authorId: user.id,
      authorName: user.name,
      content: `${label} this tactic${body.notes ? `: ${body.notes}` : "."}`,
    });
  });

  return NextResponse.json({ ok: true, status });
}
