import { getDashboardData } from "@/lib/data";
import { computeCiRollup } from "@/lib/ci";
import { ExecutiveBriefing } from "@/components/executive-briefing";
import { RefreshBar } from "@/components/refresh-bar";
import { DashboardStatCards } from "@/components/dashboard-stat-cards";
import { DashboardPrsPanel } from "@/components/dashboard-prs-panel";
import { DashboardApprovalPanel } from "@/components/dashboard-approval-panel";
import { DashboardMissionsPanel } from "@/components/dashboard-missions-panel";
import { SystemHealthPanel } from "@/components/system-health-panel";
import { ActivityTimelinePanel } from "@/components/activity-timeline-panel";
import { HermesAgentsPanel } from "@/components/hermes-agents-panel";
import { HermesApprovalPanel } from "@/components/hermes-approval-panel";
import { OpenCodePanel } from "@/components/opencode-panel";
import { ModelQuickSwap } from "@/components/model-quick-swap";
import { GoalsPanel } from "@/components/goals-panel";
import { BrainDumpPanel } from "@/components/brain-dump-panel";
import { DecisionLogPanel } from "@/components/decision-log-panel";
import { SkillsPanel } from "@/components/skills-panel";
import { EisenhowerMatrixPanel } from "@/components/eisenhower-matrix-panel";
import { SectionErrorBoundary } from "@/components/section-error-boundary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { prRows, needsReview, inbox, missions, missionList, missionHealth, resolvedTactics, syncTimes, activeGoals, brainDumpEntries, brainDumpPending, recentDecisions, topSkills, skillCount } =
    await getDashboardData();

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
    <div className="mx-auto max-w-[1400px] space-y-6">
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

      {/* Stat cards — full width */}
      <DashboardStatCards
        prCount={prTactics.length}
        ciFailingCount={ciFailing.length}
        inboxPending={inbox.pending}
        inboxSyncedAt={syncTimes.inbox}
        missionsRunning={missions.running}
        missionsPending={missions.pending}
      />

      {/* Two-column layout: main content + right sidebar */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* ── Left: Primary panels ── */}
        <div className="space-y-6 lg:col-span-8">
          <SectionErrorBoundary label="Executive briefing">
            <ExecutiveBriefing />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Awaiting approval">
            <DashboardApprovalPanel
              needsReview={needsReview}
              resolvedCount={resolvedTactics.length}
            />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Pull Requests">
            <DashboardPrsPanel prTactics={prTactics} lastSyncedAt={syncTimes.prs} />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Missions">
            <DashboardMissionsPanel
              missions={missions}
              missionList={missionList}
              health={missionHealth}
            />
          </SectionErrorBoundary>
        </div>

        {/* ── Right: Health + Activity sidebar ── */}
        <div className="space-y-6 lg:col-span-4">
          <SectionErrorBoundary label="LLM Models">
            <ModelQuickSwap />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Goals">
            <GoalsPanel goals={activeGoals} />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Brain Dump">
            <BrainDumpPanel entries={brainDumpEntries} pendingCount={brainDumpPending} />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Decisions">
            <DecisionLogPanel decisions={recentDecisions} />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Skills">
            <SkillsPanel skills={topSkills} count={skillCount} />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Priority Matrix">
            <EisenhowerMatrixPanel />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="System Health">
            <SystemHealthPanel />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Recent Activity">
            <ActivityTimelinePanel />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Agent Approvals">
            <HermesApprovalPanel />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="Hermes Agent">
            <HermesAgentsPanel />
          </SectionErrorBoundary>

          <SectionErrorBoundary label="OpenCode">
            <OpenCodePanel />
          </SectionErrorBoundary>
        </div>
      </div>
    </div>
  );
}
