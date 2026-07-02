import { NextResponse } from "next/server";
import { getOpenCodeOverview } from "@/lib/opencode";

export const dynamic = "force-dynamic";

/**
 * OpenCode overview endpoint. Used by the dashboard panel to fetch
 * sessions, projects, and health data.
 *
 * GET /api/opencode → { ok, health, sessions, projects, latencyMs }
 */
export async function GET() {
  try {
    const overview = await getOpenCodeOverview();
    return NextResponse.json(overview);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "OpenCode fetch failed",
        health: { ok: false, version: null, storagePath: "", projectCount: 0, totalSessions: 0 },
        sessions: [],
        projects: [],
        latencyMs: 0,
      },
      { status: 502 },
    );
  }
}
