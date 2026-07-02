import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getDefaultUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    content: string;
    authorType?: "human" | "agent";
    authorName?: string;
  };

  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const user = await getDefaultUser();
  const authorType = body.authorType ?? "human";
  const authorName = body.authorName ?? user?.name ?? "Operator";
  const authorId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  await db.insert(messages).values({
    parentType: "strategy",
    parentId: id,
    authorType,
    authorId,
    authorName,
    content: body.content.trim(),
  });

  return NextResponse.json({ ok: true });
}