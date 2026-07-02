import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tactics } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
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
  return NextResponse.json({ ok: true, data: tactic });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    importance?: string | null;
    urgency?: string | null;
    title?: string;
    description?: string;
    status?: string;
    confidence?: number;
    riskLevel?: string;
  };

  const updates: Record<string, unknown> = {};

  if (body.importance !== undefined) {
    const valid = ["important", "not-important", null];
    if (!valid.includes(body.importance)) {
      return NextResponse.json(
        { ok: false, error: "importance must be 'important', 'not-important', or null" },
        { status: 400 },
      );
    }
    updates.importance = body.importance;
  }

  if (body.urgency !== undefined) {
    const valid = ["urgent", "not-urgent", null];
    if (!valid.includes(body.urgency)) {
      return NextResponse.json(
        { ok: false, error: "urgency must be 'urgent', 'not-urgent', or null" },
        { status: 400 },
      );
    }
    updates.urgency = body.urgency;
  }

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.confidence !== undefined) updates.confidence = body.confidence;
  if (body.riskLevel !== undefined) updates.riskLevel = body.riskLevel;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No fields to update" },
      { status: 400 },
    );
  }

  updates.updatedAt = new Date();

  const [tactic] = await db
    .update(tactics)
    .set(updates)
    .where(eq(tactics.id, id))
    .returning();

  if (!tactic) {
    return NextResponse.json(
      { ok: false, error: "Tactic not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: tactic });
}
