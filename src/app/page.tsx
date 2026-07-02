import { Suspense } from "react";
import { getTactics, getLastSyncTimes } from "@/lib/data";
import { countInbox, countMissions, getMissions } from "@/lib/inbox";
import { computeCiRollup } from "@/lib/ci";
import { SkeletonCard } from "@/components/skeleton-card";
import { ExecutiveBriefing } from "@/components/executive-briefing";
import { MissionHealthPanel } from "@/components/mission-health-panel";
import { GovernancePanel } from "@/components/governance-panel";
import { SessionRitualPanel } from "@/components/session-ritual-panel";
import { KanbanSnapshotPanel } from "@/components/kanban-snapshot-panel";
import { RefreshBar } from "@/components/refresh-bar";
import { DashboardStatCards } from "@/components/dashboard-stat-cards";
import { DashboardPrsPanel } from "@/components/dashboard-prs-panel";
import { DashboardApprovalPanel } from "@/components/dashboard-approval-panel";
import { DashboardMissionsPanel } from "@/components/dashboard-missions-panel";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [prRows, needsReview, inbox, missions, missionList, syncTimes] =
    await Promise.all([
      getTactics({ source: "pr" }),
      getTactics({ status: "needs_review" }),
      countInbox(),
      countMissions(),
      getMissions({ limit: 5 }),
      getLastSyncTimes(),
    ]);

  const prTactics = prRows.map((t) => ({
    id: t.tactic.id,
    title: t.tactic.title,
    sourceId: t.tactic.sourceId ?? "?",
    confidence: t.tactic.confidence,
    riskLevel: t.tactic.riskLevel,
    status: t.tactic.status,
    ci: computeCiRollup(t.tactic.ciChecks),
    createdAt: t.tactic.createdAt,
  }));

  const ciFailing = prTactics.filter((p) => p.ci.state === "failing");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-slate-950 dark:text-slate-50">
            FlowManner HIL
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Real PRs, real CI, real human gates — synthesized into decisions.
          </p>
        </div>
      </header>

      <RefreshBar />

      {/* Stat cards */}
      <DashboardStatCards
        prCount={prTactics.length}
        ciFailingCount={ciFailing.length}
        inboxPending={inbox.pending}
        inboxSyncedAt={syncTimes.inbox}
        missionsRunning={missions.running}
        missionsPending={missions.pending}
      />

      {/* ════════ EXECUTIVE LAYER ════════ */}
      <SectionLabel>Executive</SectionLabel>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExecutiveBriefing />
        </div>
        <div className="space-y-4">
          <Suspense fallback={<SkeletonCard lines={4} />}>
            <SessionRitualPanel />
          </Suspense>
          <Suspense fallback={<SkeletonCard lines={4} />}>
            <MissionHealthPanel />
          </Suspense>
        </div>
      </div>

      {/* ════════ OPERATIONS LAYER ════════ */}
      <SectionLabel>Operations</SectionLabel>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionErrorBoundary label="Pull Requests">
          <DashboardPrsPanel prTactics={prTactics} lastSyncedAt={syncTimes.prs} />
        </SectionErrorBoundary>
        <SectionErrorBoundary label="Awaiting approval">
          <DashboardApprovalPanel needsReview={needsReview} />
        </SectionErrorBoundary>
      </div>

      {/* Missions in flight */}
      <SectionErrorBoundary label="Missions">
        <DashboardMissionsPanel missions={missions} missionList={missionList} />
      </SectionErrorBoundary>

      {/* ════════ KANBAN ════════ */}
      <SectionLabel>Kanban</SectionLabel>
      <SectionErrorBoundary label="Kanban Board">
        <Suspense fallback={<SkeletonCard lines={4} />}>
          <KanbanSnapshotPanel />
        </Suspense>
      </SectionErrorBoundary>

      {/* ════════ GOVERNANCE LAYER ════════ */}
      <SectionLabel>Governance</SectionLabel>
      <SectionErrorBoundary label="Human Gates">
        <Suspense fallback={<SkeletonCard lines={3} />}>
          <GovernancePanel />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
        {children}
      </h2>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
