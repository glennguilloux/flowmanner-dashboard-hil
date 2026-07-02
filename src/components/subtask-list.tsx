"use client";

import { useState, useOptimistic, useTransition } from "react";
import { CheckCircle2, Circle, Plus, Trash2, GripVertical } from "lucide-react";

type Subtask = {
  id: string;
  title: string;
  done: boolean;
  order: number;
};

export function SubtaskList({
  tacticId,
  subtasks: initialSubtasks,
}: {
  tacticId: string;
  subtasks: Subtask[];
}) {
  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [optimistic, addOptimistic] = useOptimistic(
    subtasks,
    (state: Subtask[], action: { type: "toggle"; id: string } | { type: "add"; subtask: Subtask } | { type: "remove"; id: string }) => {
      switch (action.type) {
        case "toggle":
          return state.map((s) => (s.id === action.id ? { ...s, done: !s.done } : s));
        case "add":
          return [...state, action.subtask];
        case "remove":
          return state.filter((s) => s.id !== action.id);
        default:
          return state;
      }
    },
  );
  const [, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const doneCount = optimistic.filter((s) => s.done).length;
  const totalCount = optimistic.length;

  async function toggleSubtask(subtask: Subtask) {
    startTransition(() => {
      addOptimistic({ type: "toggle", id: subtask.id });
    });

    try {
      const res = await fetch(`/api/tactics/${tacticId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !subtask.done }),
      });
      const data = (await res.json()) as { ok: boolean; data?: Subtask };
      if (data.ok && data.data) {
        setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? data.data! : s)));
      }
    } catch {
      // Rollback optimistic update
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, done: subtask.done } : s)));
    }
  }

  async function addSubtask() {
    const title = newTitle.trim();
    if (!title) return;

    const tempId = `temp-${Date.now()}`;
    startTransition(() => {
      addOptimistic({
        type: "add",
        subtask: { id: tempId, title, done: false, order: totalCount },
      });
    });
    setNewTitle("");
    setAdding(true);

    try {
      const res = await fetch(`/api/tactics/${tacticId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, order: totalCount }),
      });
      const data = (await res.json()) as { ok: boolean; data?: Subtask };
      if (data.ok && data.data) {
        setSubtasks((prev) => [...prev.filter((s) => s.id !== tempId), data.data!]);
      }
    } catch {
      setSubtasks((prev) => prev.filter((s) => s.id !== tempId));
    } finally {
      setAdding(false);
    }
  }

  async function removeSubtask(subtask: Subtask) {
    startTransition(() => {
      addOptimistic({ type: "remove", id: subtask.id });
    });

    try {
      await fetch(`/api/tactics/${tacticId}/subtasks/${subtask.id}`, {
        method: "DELETE",
      });
      setSubtasks((prev) => prev.filter((s) => s.id !== subtask.id));
    } catch {
      setSubtasks((prev) => [...prev, subtask]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Subtasks
        </h3>
        {totalCount > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {doneCount}/{totalCount} done
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(doneCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Subtask items */}
      <ul className="space-y-1">
        {optimistic.map((subtask) => (
          <li
            key={subtask.id}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <button
              type="button"
              onClick={() => toggleSubtask(subtask)}
              className="shrink-0"
              aria-label={subtask.done ? "Mark as not done" : "Mark as done"}
            >
              {subtask.done ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              ) : (
                <Circle className="h-4.5 w-4.5 text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-colors" />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${
                subtask.done
                  ? "text-slate-400 line-through"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {subtask.title}
            </span>
            <button
              type="button"
              onClick={() => removeSubtask(subtask)}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500"
              aria-label="Delete subtask"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Add new subtask */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTitle.trim()) addSubtask();
          }}
          placeholder="Add a subtask…"
          disabled={adding}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addSubtask}
          disabled={!newTitle.trim() || adding}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {totalCount === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No subtasks yet. Break this tactic into smaller steps.
        </p>
      )}
    </div>
  );
}
