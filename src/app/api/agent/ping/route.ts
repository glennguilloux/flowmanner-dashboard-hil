import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentHeartbeats } from "@/db/schema";

export const dynamic = "force-dynamic";

// POST — agents push status updates. No auth check (intranet-only).
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    agentId: string;
    status: string;
    task: string;
    progress?: number;
    logLine?: string;
    tone?: string;
  };

  if (!body.agentId || !body.status || !body.task) {
    return NextResponse.json(
      { error: "agentId, status, and task are required" },
      { status: 400 },
    );
  }

  await db.insert(agentHeartbeats).values({
    agentId: body.agentId,
    status: body.status,
    task: body.task,
    progress: body.progress ?? null,
    logLine: body.logLine ?? null,
    tone: body.tone ?? "neutral",
  });

  return NextResponse.json({ ok: true });
}
