// FM inbox_items write-back. Resolves items in the public schema via raw SQL.
// Uses parameterized queries — NEVER string interpolation for values.

import { sql } from "drizzle-orm";
import { db } from "@/db";

type ResolveResult = { ok: boolean; error?: string };

/**
 * Resolve an FM inbox_item by setting its status, resolved_at, and resolution
 * JSON blob. Returns { ok: true } on success.
 */
export async function resolveInboxItem(
  itemId: string,
  resolution: { decision: string; notes: string },
): Promise<ResolveResult> {
  try {
    const resolutionJson = JSON.stringify(resolution);
    await db.execute(sql`
      UPDATE public.inbox_items
      SET status = 'resolved',
          resolved_at = NOW(),
          resolution_note = ${resolutionJson}
      WHERE id = ${itemId}
    `);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
