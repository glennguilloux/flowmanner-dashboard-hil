import { NextRequest, NextResponse } from "next/server";
import {
  getApprovals,
  submitApprovalDecision,
  type HermesApprovalScope,
} from "@/lib/hermes-acp";
import { isUnauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/hermes/approvals — list pending (and recently resolved) approval
 * requests from the Hermes agent. Returns [] if the endpoint doesn't exist
 * (older Hermes versions without ACP approval bridge).
 */
export async function GET() {
  try {
    const approvals = await getApprovals();
    return NextResponse.json({ ok: true, approvals });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Hermes approvals fetch failed",
        approvals: [],
      },
      { status: 502 },
    );
  }
}

/**
 * POST /api/hermes/approvals — submit an approval decision for a specific
 * request. Body: { approvalId, scope, notes? }
 *
 * The decision is forwarded to Hermes which resumes or aborts the suspended
 * agent task accordingly.
 */
export async function POST(request: NextRequest) {
  if (await isUnauthorized()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    approvalId?: string;
    scope?: HermesApprovalScope;
    notes?: string;
  };

  if (!body.approvalId) {
    return NextResponse.json(
      { error: "approvalId is required" },
      { status: 400 },
    );
  }

  if (
    !body.scope ||
    !["allow_once", "allow_session", "allow_always", "deny"].includes(
      body.scope,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "scope is required and must be one of: allow_once, allow_session, allow_always, deny",
      },
      { status: 400 },
    );
  }

  const result = await submitApprovalDecision(body.approvalId, {
    scope: body.scope,
    notes: body.notes,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Submit failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
