import { NextResponse } from "next/server";
import { checkHermesHealth } from "@/lib/hermes-acp";

export const dynamic = "force-dynamic";

/**
 * Lightweight health check for the Hermes sidebar chip.
 * Separate from /api/hermes so the chip can poll cheaply.
 */
export async function GET() {
  try {
    const health = await checkHermesHealth();
    return NextResponse.json(health);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Health check failed",
      },
      { status: 502 },
    );
  }
}
