import { db } from "@/db";
import { tacticEvents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export type TacticEventType =
  | "proposed"
  | "reviewed"
  | "gated"
  | "approved"
  | "rejected"
  | "requested_info"
  | "escalated"
  | "execution_started"
  | "completed"
  | "failed"
  | "reset";

type LogEventParams = {
  tacticId: string;
  eventType: TacticEventType;
  fromStatus?: string;
  toStatus?: string;
  actorType: "human" | "agent";
  actorName: string;
  detail?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget event logger. Never throws — errors are logged to console
 * so callers don't need to handle failures.
 */
export function logTacticEvent(params: LogEventParams): void {
  db.insert(tacticEvents)
    .values({
      tacticId: params.tacticId,
      eventType: params.eventType as typeof tacticEvents.$inferInsert.eventType,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus ?? null,
      actorType: params.actorType,
      actorName: params.actorName,
      detail: params.detail ?? null,
      metadata: params.metadata ?? null,
    })
    .catch((err) =>
      console.error("[event-journal] failed to log event:"
        , err instanceof Error ? err.message : err),
    );
}

/** Get all events for a tactic, ordered oldest-first. */
export async function getTacticEvents(tacticId: string) {
  return db
    .select()
    .from(tacticEvents)
    .where(eq(tacticEvents.tacticId, tacticId))
    .orderBy(tacticEvents.createdAt);
}

/** Get the N most recent events across all tactics. */
export async function getRecentEvents(limit = 50) {
  return db
    .select()
    .from(tacticEvents)
    .orderBy(desc(tacticEvents.createdAt))
    .limit(limit);
}
