import { NextResponse } from "next/server";
import { db } from "@/db";
import { tactics, messages } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST — reset attemptCount to 0 after human review of an escalated tactic.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const tactic = await db.query.tactics.findFirst({
    where: eq(tactics.id, id),
  });

  if (!tactic) {
    return NextResponse.json(
      { ok: false, error: "Tactic not found" },
      { status: 404 },
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tactics)
      .set({
        attemptCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(tactics.id, id));

    await tx.insert(messages).values({
      parentType: "tactic",
      parentId: id,
      authorType: "human",
      authorId: "00000000-0000-0000-0000-000000000000",
      authorName: "System",
      content: `Attempt counter reset from ${tactic.attemptCount}/${tactic.maxAttempts} to 0. Tactic can be retried.`,
    });
  });

  return NextResponse.json({ ok: true });
}
