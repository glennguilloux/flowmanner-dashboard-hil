import { db } from "@/db";
import { tactics, tacticDependencies } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { Node, Edge } from "@xyflow/react";

export type DagNodeData = {
  label: string;
  status: string;
  confidence: number;
  riskLevel: string;
  agentName: string | null;
  tokensUsed: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  approved: "#10b981",
  running: "#3b82f6",
  needs_review: "#f59e0b",
  proposed: "#94a3b8",
  rejected: "#ef4444",
  failed: "#ef4444",
};

export async function buildDagData(
  strategyId: string,
): Promise<{ nodes: Node<DagNodeData>[]; edges: Edge[] }> {
  const tacticRows = await db
    .select({
      id: tactics.id,
      title: tactics.title,
      status: tactics.status,
      confidence: tactics.confidence,
      riskLevel: tactics.riskLevel,
    })
    .from(tactics)
    .where(eq(tactics.strategyId, strategyId));

  const tacticIds = new Set(tacticRows.map((t) => t.id));

  const tacticIdList = tacticRows.map((t) => t.id);
  const depRows = tacticIdList.length > 0
    ? await db
        .select()
        .from(tacticDependencies)
        .where(inArray(tacticDependencies.blockerId, tacticIdList))
    : [];

  // Filter to only deps within this strategy
  const filteredDeps = depRows.filter(
    (d) => tacticIds.has(d.blockerId) && tacticIds.has(d.blockedId),
  );

  // Build adjacency for topological sort (simple BFS layout)
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const t of tacticRows) {
    inDegree.set(t.id, 0);
    adjacency.set(t.id, []);
  }
  for (const dep of filteredDeps) {
    inDegree.set(dep.blockedId, (inDegree.get(dep.blockedId) ?? 0) + 1);
    adjacency.get(dep.blockerId)?.push(dep.blockedId);
  }

  // Assign levels via BFS
  const levels = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      levels.set(id, 0);
    }
  }
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) ?? 0;
    for (const next of adjacency.get(current) ?? []) {
      const nextLevel = Math.max(levels.get(next) ?? 0, currentLevel + 1);
      levels.set(next, nextLevel);
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // Group by level for Y positioning
  const levelGroups = new Map<number, string[]>();
  for (const [id, level] of levels) {
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(id);
  }

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;
  const H_GAP = 60;
  const V_GAP = 80;

  const nodes: Node<DagNodeData>[] = tacticRows.map((t) => {
    const level = levels.get(t.id) ?? 0;
    const group = levelGroups.get(level) ?? [];
    const indexInLevel = group.indexOf(t.id);

    return {
      id: t.id,
      type: "dagNode",
      position: {
        x: level * (NODE_WIDTH + H_GAP),
        y: indexInLevel * (NODE_HEIGHT + V_GAP),
      },
      data: {
        label: t.title,
        status: t.status,
        confidence: t.confidence,
        riskLevel: t.riskLevel,
        agentName: null,
        tokensUsed: null,
      },
    };
  });

  const edges: Edge[] = filteredDeps.map((d) => ({
    id: `${d.blockerId}-${d.blockedId}`,
    source: d.blockerId,
    target: d.blockedId,
    animated: true,
    style: { stroke: "#94a3b8" },
  }));

  return { nodes, edges };
}
