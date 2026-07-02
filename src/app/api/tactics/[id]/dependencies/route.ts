import { NextRequest, NextResponse } from "next/server";
import { addDependency, removeDependency } from "@/lib/tactic-details";

export const dynamic = "force-dynamic";

// POST — add a blocker dependency (blockerId blocks this tactic)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: blockedId } = await params;
  const body = (await request.json()) as { blockerId?: string };

  if (!body.blockerId) {
    return NextResponse.json(
      { ok: false, error: "blockerId is required" },
      { status: 400 },
    );
  }

  if (body.blockerId === blockedId) {
    return NextResponse.json(
      { ok: false, error: "A tactic cannot block itself" },
      { status: 400 },
    );
  }

  const result = await addDependency(body.blockerId, blockedId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}

// DELETE — remove a blocker dependency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: blockedId } = await params;
  const body = (await request.json()) as { blockerId?: string };

  if (!body.blockerId) {
    return NextResponse.json(
      { ok: false, error: "blockerId is required" },
      { status: 400 },
    );
  }

  await removeDependency(body.blockerId, blockedId);
  return NextResponse.json({ ok: true });
}
