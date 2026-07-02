import { getKanbanBoard } from "@/lib/kanban";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  LayoutGrid,
  Tag,
} from "lucide-react";

export async function KanbanSnapshotPanel() {
  const board = await getKanbanBoard();

  if (!board.available) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Kanban Board</h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-500">
          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
          {board.error ?? "Board not available"}
        </div>
      </div>
    );
  }

  const statusEntries = Object.entries(board.byStatus).sort(
    ([, a], [, b]) => b - a,
  );
  const categoryEntries = Object.entries(board.byCategory).sort(
    ([, a], [, b]) => b - a,
  );

  const totalTasks = board.tasks.length;
  const doneTasks = board.byStatus["done"] ?? 0;
  const allDone = totalTasks > 0 && doneTasks === totalTasks;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Kanban Board</h2>
        </div>
        <div className="flex items-center gap-2">
          {allDone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> All done
            </span>
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400">{totalTasks} tasks</span>
        </div>
      </div>

      {board.updatedAt && (
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Updated{" "}
          <time
            dateTime={board.updatedAt}
            title={new Date(board.updatedAt).toLocaleString()}
          >
            {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
          </time>
          {board.version && (
            <>
              {" · "}v{board.version}
            </>
          )}
        </p>
      )}

      {/* Status breakdown */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusEntries.map(([status, count]) => (
          <span
            key={status}
            className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", statusBadgeClass(status)].join(" ")}
          >
            {statusIcon(status)}
            {status} ({count})
          </span>
        ))}
      </div>

      {/* Category breakdown */}
      {categoryEntries.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {categoryEntries.map(([cat, count]) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600"
            >
              <Tag className="h-3 w-3" />
              {cat} ({count})
            </span>
          ))}
        </div>
      )}

      {/* Config summary */}
      {board.config && (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Work budget:{" "}
            <span className="font-medium text-slate-700">
              {board.config.workBudgetMinutes}m
            </span>
          </span>
          <span>
            Stale claim:{" "}
            <span className="font-medium text-slate-700">
              {board.config.staleClaimMinutes}m
            </span>
          </span>
          {board.config.humanReviewRequired.length > 0 && (
            <span>
              Human review:{" "}
              <span className="font-medium text-slate-700">
                {board.config.humanReviewRequired.join(", ")}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Task list */}
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {board.tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="mt-0.5 shrink-0">{statusIcon(task.status)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {task.title}
                </p>
                <span className="shrink-0 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                  P{task.priority}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600">
                  {task.category}
                </span>
                <span>phase {task.phase}</span>
                {task.estimateMinutes > 0 && (
                  <span>· {task.estimateMinutes}m</span>
                )}
                {task.claimedBy && (
                  <span className="text-amber-600">
                    · claimed by {task.claimedBy}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
      return "bg-indigo-100 text-indigo-700";
    case "blocked":
      return "bg-rose-100 text-rose-700";
    case "todo":
    case "backlog":
      return "bg-slate-100 dark:bg-slate-800 text-slate-600";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-600";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "in_progress":
      return <Clock className="h-3.5 w-3.5 text-indigo-500" />;
    case "blocked":
      return <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />;
    default:
      return <span className="h-3.5 w-3.5 rounded-full bg-slate-300" />;
  }
}
