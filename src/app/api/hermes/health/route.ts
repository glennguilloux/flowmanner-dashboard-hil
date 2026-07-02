import { NextResponse } from "next/server";
import { checkHermesHealth, getPendingApprovalCount } from "@/lib/hermes-acp";

export const dynamic = "force-dynamic";

/**
 * Lightweight health check for the Hermes sidebar chip.
 * Includes pendingApprovals count so the chip can show a badge.
 * Separate from /api/hermes so the chip can poll cheaply.
 */
export async function GET() {
  try {
    // Lightweight: health check + single-attempt approval count.
    // Uses getPendingApprovalCount() which only tries /v1/approvals (no
    // fallback) to keep the chip poll fast.
    const [health, pendingApprovals] = await Promise.all([
      checkHermesHealth(),
      getPendingApprovalCount(),
    ]);
    return NextResponse.json({ ...health, pendingApprovals });
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
