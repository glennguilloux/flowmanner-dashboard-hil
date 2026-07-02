import { NextResponse } from "next/server";

// Lightweight health check endpoint for polling during model swap.
// Separate from /api/models because Next.js App Router needs a dedicated
// route file for nested paths.

const DAEMON_URL = process.env.MODEL_MANAGER_URL ?? "http://localhost:9723";

export async function GET() {
  try {
    const start = Date.now();
    const res = await fetch(`${DAEMON_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Daemon returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, health: data, latencyMs });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Daemon unreachable: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}
