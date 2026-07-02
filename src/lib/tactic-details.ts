import { db } from "@/db";
import {
  tacticDependencies,
  tacticSubtasks,
  tactics,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

// ── Cycle Detection ───────────────────────────────────────────────────────

/**
 * Before inserting a dependency (blockerId → blockedId), traverse blockerId's
 * upstream chain via DFS. If blockedId appears anywhere in the chain, inserting
 * this edge would create a cycle.
 */
export async function wouldCreateCycle(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const visited = new Set<string>();
  const stack = [blockerId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === blockedId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find what blocks `current` (i.e. edges where current is blockedId)
    const blockers = await db
      .select({ blockerId: tacticDependencies.blockerId })
      .from(tacticDependencies)
      .where(eq(tacticDependencies.blockedId, current));

    for (const b of blockers) {
      stack.push(b.blockerId);
    }
  }

  return false;
}

// ── Dependency Queries ────────────────────────────────────────────────────

export type DependencyInfo = {
  blockers: { id: string; title: string; status: string }[];
  blocked: { id: string; title: string; status: string }[];
};

export async function getDependencies(tacticId: string): Promise<DependencyInfo> {
  // Tactics that block this one (this tactic is blocked by them)
  const blockerRows = await db
    .select({
      id: tactics.id,
      title: tactics.title,
      status: tactics.status,
    })
    .from(tacticDependencies)
    .innerJoin(tactics, eq(tacticDependencies.blockerId, tactics.id))
    .where(eq(tacticDependencies.blockedId, tacticId));

  // Tactics that this one blocks (they are blocked by this tactic)
  const blockedRows = await db
    .select({
      id: tactics.id,
      title: tactics.title,
      status: tactics.status,
    })
    .from(tacticDependencies)
    .innerJoin(tactics, eq(tacticDependencies.blockedId, tactics.id))
    .where(eq(tacticDependencies.blockerId, tacticId));

  return {
    blockers: blockerRows,
    blocked: blockedRows,
  };
}

export async function addDependency(blockerId: string, blockedId: string) {
  // Check for cycles first
  const cycle = await wouldCreateCycle(blockerId, blockedId);
  if (cycle) {
    return { ok: false as const, error: "Circular dependency detected" };
  }

  await db
    .insert(tacticDependencies)
    .values({ blockerId, blockedId })
    .onConflictDoNothing();

  return { ok: true as const };
}

export async function removeDependency(blockerId: string, blockedId: string) {
  await db
    .delete(tacticDependencies)
    .where(
      and(
        eq(tacticDependencies.blockerId, blockerId),
        eq(tacticDependencies.blockedId, blockedId),
      ),
    );

  return { ok: true as const };
}

// ── Subtask Queries ───────────────────────────────────────────────────────

export type Subtask = typeof tacticSubtasks.$inferSelect;

export async function getSubtasks(tacticId: string): Promise<Subtask[]> {
  return db
    .select()
    .from(tacticSubtasks)
    .where(eq(tacticSubtasks.tacticId, tacticId))
    .orderBy(tacticSubtasks.order, tacticSubtasks.createdAt);
}

export async function createSubtask(tacticId: string, title: string, order = 0) {
  const [subtask] = await db
    .insert(tacticSubtasks)
    .values({ tacticId, title, order })
    .returning();
  return subtask;
}

export async function updateSubtask(
  subtaskId: string,
  data: { title?: string; done?: boolean; order?: number },
) {
  const [subtask] = await db
    .update(tacticSubtasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tacticSubtasks.id, subtaskId))
    .returning();
  return subtask;
}

export async function deleteSubtask(subtaskId: string) {
  await db.delete(tacticSubtasks).where(eq(tacticSubtasks.id, subtaskId));
}
