import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tactics, approvals, messages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDefaultUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as {
    decision: "approve" | "reject" | "request_more_info";
    notes?: string;
  };

  const user = await getDefaultUser();
  if (!user) {
    return NextResponse.json({ error: "No operator found" }, { status: 400 });
  }

  const tactic = await db.query.tactics.findFirst({ where: eq(tactics.id, id) });
  if (!tactic) {
    return NextResponse.json({ error: "Tactic not found" }, { status: 404 });
  }

  let status: (typeof tactics.$inferSelect)["status"] = "needs_review";
  if (body.decision === "approve") status = "approved";
  if (body.decision === "reject") status = "rejected";
  if (body.decision === "request_more_info") status = "needs_review";

  await db
    .update(tactics)
    .set({
      status,
      humanDecision: body.decision,
      updatedAt: new Date(),
    })
    .where(eq(tactics.id, id));

  await db.insert(approvals).values({
    tacticId: id,
    decision: body.decision,
    notes: body.notes ?? null,
    decidedBy: user.id,
  });

  const label =
    body.decision === "approve"
      ? "approved"
      : body.decision === "reject"
      ? "rejected"
      : "requested more information on";

  await db.insert(messages).values({
    parentType: "tactic",
    parentId: id,
    authorType: "human",
    authorId: user.id,
    authorName: user.name,
    content: `${label} this tactic${body.notes ? `: ${body.notes}` : "."}`,
  });

  return NextResponse.json({ ok: true, status });
}
