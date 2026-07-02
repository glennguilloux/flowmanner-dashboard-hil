import { NextResponse } from "next/server";
import { getHermesOverview } from "@/lib/hermes-acp";

export const dynamic = "force-dynamic";

/**
 * Full Hermes overview endpoint. Used by the slide-over panel to fetch
 * sessions, jobs, skills, tools, and capabilities in a single call.
 *
 * GET /api/hermes → { ok, health, sessions, jobs, skills, tools, capabilities, latencyMs }
 */
export async function GET() {
  try {
    const overview = await getHermesOverview();
    return NextResponse.json(overview);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Hermes fetch failed",
        health: { ok: false },
        sessions: [],
        jobs: [],
        skills: [],
        tools: [],
        capabilities: [],
        latencyMs: 0,
      },
      { status: 502 },
    );
  }
}
