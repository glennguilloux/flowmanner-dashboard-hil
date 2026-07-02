import { NextRequest, NextResponse } from "next/server";
import { getBrainDumpEntries, createBrainDumpEntry } from "@/lib/brain-dump";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getBrainDumpEntries();
  return NextResponse.json({ ok: true, data });
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
