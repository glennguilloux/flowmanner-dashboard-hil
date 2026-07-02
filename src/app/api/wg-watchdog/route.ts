import { NextRequest, NextResponse } from "next/server";
import {
  getAllStatus,
  setEnabled,
  readAudit,
  recordAudit,
  getActor,
  type AuditEntry,
  type MachineId,
} from "@/lib/wg-watchdog";

export const dynamic = "force-dynamic";

// GET /api/wg-watchdog — return status of both machines + last audit entry.
export async function GET() {
  const start = Date.now();
  try {
    const [machines, audit] = await Promise.all([getAllStatus(), readAudit()]);
    return NextResponse.json({
      ok: true,
      machines,
      lastSwap: audit.lastSwap,
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to read wg-watchdog status: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}

// POST /api/wg-watchdog — toggle one machine. Body: { machineId, action }.
// action: "enable" | "disable"
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const machineId = (body as { machineId?: unknown })?.machineId;
  const action = (body as { action?: unknown })?.action;

  if (machineId !== "homelab" && machineId !== "vps") {
    return NextResponse.json(
      { ok: false, error: "machineId must be 'homelab' or 'vps'" },
      { status: 400 },
    );
  }
  if (action !== "enable" && action !== "disable") {
    return NextResponse.json(
      { ok: false, error: "action must be 'enable' or 'disable'" },
      { status: 400 },
    );
  }

  const id = machineId as MachineId;
  const actor = getActor();
  let resultStr: "ok" | string = "ok";
  let httpErr: string | null = null;

  try {
    await setEnabled(id, action === "enable");
    const fresh = await getAllStatus();
    const updated = fresh.find((m) => m.id === id) ?? null;
    // lastSwap is NOT returned here — it's read in the try block BEFORE the
    // finally writes the new entry, so any value would be stale by one write.
    // The chip surfaces lastSwap via GET on its own focus lifecycle.
    return NextResponse.json({
      ok: true,
      machine: updated,
    });
  } catch (err) {
    resultStr = err instanceof Error ? err.message : String(err);
    httpErr = `Toggle failed on ${id}: ${resultStr}`;
  } finally {
    // Record the attempt regardless of outcome — failed attempts are part of
    // the audit trail too. The audit write itself is best-effort and is
    // already swallowed in recordAudit's write chain.
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      actor,
      machineId: id,
      action: action as "enable" | "disable",
      result: resultStr,
    };
    await recordAudit(entry);
  }

  return NextResponse.json(
    { ok: false, error: httpErr ?? "Toggle failed" },
    { status: 502 },
  );
}
