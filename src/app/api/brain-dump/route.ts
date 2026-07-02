import { NextRequest, NextResponse } from "next/server";
import { getBrainDumpEntries, countBrainDump, createBrainDumpEntry } from "@/lib/brain-dump";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 50, 200);
  const offset = Number(sp.get("offset")) || 0;

  const [data, total] = await Promise.all([
    getBrainDumpEntries(limit, offset),
    countBrainDump(),
  ]);

  return NextResponse.json({
    ok: true,
    data,
    meta: { total, returned: data.length, limit, offset },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    content?: string;
    source?: "manual" | "voice" | "slack" | "email";
    tags?: string[];
  };

  if (!body.content?.trim()) {
    return NextResponse.json(
      { ok: false, error: "content is required" },
      { status: 400 },
    );
  }

  const entry = await createBrainDumpEntry({
    content: body.content.trim(),
    source: body.source,
    tags: body.tags,
  });

  return NextResponse.json({ ok: true, data: entry });
}
