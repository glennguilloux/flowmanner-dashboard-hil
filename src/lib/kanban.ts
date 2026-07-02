// Kanban board reader. Loads .hermes/kanban/board.json from the FM backend
// repo and returns typed data for the dashboard panel.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const FM_REPO = process.env.FM_REPO_PATH ?? "/opt/flowmanner";
const BOARD_REL = process.env.KANBAN_BOARD_PATH ?? ".hermes/kanban/board.json";

export type KanbanTask = {
  id: string;
  title: string;
  phase: string;
  category: string;
  priority: number;
  status: string;
  claimedBy: string | null;
  claimedAt: string | null;
  lastTouchedAt: string | null;
  estimateMinutes: number;
  acceptanceCriteria: string[];
  notes: string;

};

export type KanbanConfig = {
  workBudgetMinutes: number;
  staleClaimMinutes: number;
  humanReviewRequired: string[];
};

export type KanbanBoard = {
  available: boolean;
  version: string | null;
  updatedAt: string | null;
  config: KanbanConfig | null;
  tasks: KanbanTask[];
  /** Task counts by status. */
  byStatus: Record<string, number>;
  /** Task counts by category. */
  byCategory: Record<string, number>;
  /** Task counts by phase. */
  byPhase: Record<string, number>;
  error: string | null;
};

type RawTask = {
  id: string;
  title: string;
  phase: string;
  category: string;
  priority: number;
  file_paths?: string[];
  context_paths?: string[];
  estimate_minutes?: number;
  status: string;
  claimed_by?: string | null;
  claimed_at?: string | null;
  last_touched_at?: string | null;
  acceptance_criteria?: string[];
  verify_commands?: string[];
  notes?: string;
};

type RawBoard = {
  version?: string;
  updated_at?: string;
  config?: {
    work_budget_minutes?: number;
    stale_claim_minutes?: number;
    human_review_required?: string[];
  };
  tasks?: RawTask[];
};

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}

export async function getKanbanBoard(): Promise<KanbanBoard> {
  const filePath = join(FM_REPO, BOARD_REL);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    return {
      available: false,
      version: null,
      updatedAt: null,
      config: null,
      tasks: [],
      byStatus: {},
      byCategory: {},
      byPhase: {},
      error: `Board not found at ${filePath}`,
    };
  }

  try {
    const board = JSON.parse(raw) as RawBoard;
    const tasks: KanbanTask[] = (board.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      phase: t.phase,
      category: t.category,
      priority: t.priority,
      status: t.status,
      claimedBy: t.claimed_by ?? null,
      claimedAt: t.claimed_at ?? null,
      lastTouchedAt: t.last_touched_at ?? null,
      estimateMinutes: t.estimate_minutes ?? 0,
      acceptanceCriteria: t.acceptance_criteria ?? [],
      notes: t.notes ?? "",

    }));

    // Sort by priority ascending (lower number = higher priority).
    tasks.sort((a, b) => a.priority - b.priority);

    const config: KanbanConfig | null = board.config
      ? {
          workBudgetMinutes: board.config.work_budget_minutes ?? 25,
          staleClaimMinutes: board.config.stale_claim_minutes ?? 90,
          humanReviewRequired: board.config.human_review_required ?? [],
        }
      : null;

    return {
      available: true,
      version: board.version ?? null,
      updatedAt: board.updated_at ?? null,
      config,
      tasks,
      byStatus: countBy(tasks, (t) => t.status),
      byCategory: countBy(tasks, (t) => t.category),
      byPhase: countBy(tasks, (t) => t.phase),
      error: null,
    };
  } catch (err) {
    return {
      available: false,
      version: null,
      updatedAt: null,
      config: null,
      tasks: [],
      byStatus: {},
      byCategory: {},
      byPhase: {},
      error: `Failed to parse board: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
