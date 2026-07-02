import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/activity-timeline";

export const dynamic = "force-dynamic";

/**
 * Activity timeline data endpoint. Called by the ActivityTimelinePanel client
 * component for auto-refresh polling without full page reload.
 *
 * GET /api/activity-timeline → { ok, events, timestamp }
 */
export async function GET() {
  try {
    const events = await getRecentActivity(12);

    // Serialize Date objects to ISO strings for JSON transport.
    const serialized = events.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      events: serialized,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Timeline fetch failed",
        events: [],
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}
