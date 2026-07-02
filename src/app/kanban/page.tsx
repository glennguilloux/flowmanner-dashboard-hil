import { Suspense } from "react";
import { SkeletonCard } from "@/components/skeleton-card";
import { KanbanSnapshotPanel } from "@/components/kanban-snapshot-panel";
import { RefreshBar } from "@/components/refresh-bar";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

export const dynamic = "force-dynamic";

export default function KanbanPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
          Kanban Board
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Local tasks from <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-xs">.hermes/kanban/board.json</code>{" "}
          — read-only snapshot of your task pipeline.
        </p>
      </header>

      <RefreshBar />

      <SectionErrorBoundary label="Kanban Board">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <KanbanSnapshotPanel />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
