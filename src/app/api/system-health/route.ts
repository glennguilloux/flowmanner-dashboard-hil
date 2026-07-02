import { NextResponse } from "next/server";
import { getSystemHealth } from "@/lib/system-health";

export const dynamic = "force-dynamic";

/**
 * System health data endpoint. Called by the SystemHealthPanel client component
 * for auto-refresh polling without full page reload.
 *
 * GET /api/system-health → { ok, services, timestamp }
 */
export async function GET() {
  try {
    const services = await getSystemHealth();
    return NextResponse.json({
      ok: true,
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Health check failed",
        services: [],
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}
