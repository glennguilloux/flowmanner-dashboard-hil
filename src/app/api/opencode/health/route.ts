import { NextResponse } from "next/server";
import { getOpenCodeHealth } from "@/lib/opencode";

export const dynamic = "force-dynamic";

/**
 * Lightweight OpenCode health check for the sidebar chip.
 * Separate from /api/opencode so the chip can poll cheaply.
 */
export async function GET() {
  try {
    const health = await getOpenCodeHealth();
    return NextResponse.json(health);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        version: null,
        storagePath: "",
        projectCount: 0,
        totalSessions: 0,
        error: err instanceof Error ? err.message : "Health check failed",
      },
      { status: 502 },
    );
  }
}
