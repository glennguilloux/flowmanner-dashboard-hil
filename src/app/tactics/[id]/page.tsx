import Link from "next/link";
import { notFound } from "next/navigation";
import { getTacticDetail, getDefaultUser } from "@/lib/data";
import { getSubtasks, getDependencies } from "@/lib/tactic-details";
import { MessageThread } from "@/components/message-thread";
import { ApprovalGate } from "@/components/approval-gate";
import { StatusBadge, ConfidenceBadge, RiskBadge } from "@/components/status-badge";
import { PrCiPanel } from "@/components/pr-ci-panel";
import { PrMergeButton } from "@/components/pr-merge-button";
import { AttemptBadge } from "@/components/attempt-badge";
import { EscalationNotice } from "@/components/escalation-notice";
import { ArrowLeft, AlertTriangle, Bot, Target, GitPullRequest, ExternalLink } from "lucide-react";
import { LlmReviewButton } from "@/components/llm-review-button";
import { computeCiRollup } from "@/lib/ci";
import { SubtaskList } from "@/components/subtask-list";
import { DependencyBadge } from "@/components/dependency-badge";
import { AcceptanceCriteriaList } from "@/components/acceptance-criteria-list";
import { TimeTrackingDisplay } from "@/components/time-tracking-display";

export const dynamic = "force-dynamic";

export default async function TacticDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tactic = await getTacticDetail(id);
  const user = await getDefaultUser();

  if (!tactic) notFound();

  // Fetch Phase 7 data: subtasks and dependencies
  const [subtasks, deps] = await Promise.all([
    getSubtasks(id),
    getDependencies(id),
  ]);

  const isPr = tactic.source === "pr";
  const ciRollup = isPr ? computeCiRollup(tactic.ciChecks) : null;
  const prUrl = isPr && tactic.sourceId
    ? `https://github.com/${process.env.GH_REPO ?? "glennguilloux/flowmanner"}/pull/${tactic.sourceId}`
    : null;

  // PR-tactics get the merge button only when status is needs_review (or proposed w/ passing CI),
  // and the underlying PR is mergeable.
  const showMergeButton =
    isPr &&
    tactic.status !== "completed" &&
    tactic.status !== "approved" &&
    ciRollup !== null;
  const mergeDisabled = ciRollup
    ? ciRollup.state !== "passing" ||
      (tactic.prMergeable !== null && tactic.prMergeable !== undefined && tactic.prMergeable !== "MERGEABLE")
    : true;
  const mergeDisabledReason = ciRollup?.state === "failing"
    ? "Cannot merge — CI is failing."
    : ciRollup?.state === "pending"
    ? "Cannot merge — CI is still running."
    : tactic.prMergeable === "CONFLICTING"
    ? "Cannot merge — PR has merge conflicts."
    : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href={isPr ? "/prs" : "/tactics"}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {isPr ? "PRs" : "tactics"}
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isPr ? <GitPullRequest className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
              {isPr ? "Pull Request" : "Tactic for"}{" "}
              {!isPr && (
                <Link
                  href={tactic.strategy ? `/strategies/${tactic.strategy.id}` : "/strategies"}
                  className="text-indigo-600 hover:underline"
                >
                  {tactic.strategy?.title ?? "Unknown strategy"}
                </Link>
              )}
              {isPr && prUrl && (
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  open on GitHub <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {tactic.title}
            </h1>
            <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-slate-400">{tactic.description}</p>
          </div>
          <StatusBadge status={tactic.status} kind="tactic" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {tactic.steps.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">CI checks</h2>
                {isPr ? (
                  <div className="mt-2">
                    {ciRollup && ciRollup.checks.length > 0 ? (
                      <PrCiPanel {...ciRollup} />
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No CI checks yet.</p>
                    )}
                  </div>
                ) : (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    {tactic.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {Array.isArray(tactic.sources) && tactic.sources.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sources</h2>
                <ul className="mt-2 space-y-1.5">
                  {(tactic.sources as { title: string; url: string }[]).map(
                    (source, i) => (
                      <li key={i}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          {source.title}
                        </a>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            {tactic.uncertaintyNotes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  Uncertainty
                </div>
                <p className="mt-1 text-sm text-amber-800">
                  {tactic.uncertaintyNotes}
                </p>
              </div>
            )}

            {/* Phase 7: Dependencies */}
            <DependencyBadge
              blockers={deps.blockers}
              blocked={deps.blocked}
            />

            {/* Phase 7: Acceptance Criteria */}
            <AcceptanceCriteriaList criteria={tactic.acceptanceCriteria} />
          </div>

          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-800 p-5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bot className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold">Assessment</h2>
            </div>
            <div className="space-y-3 text-sm">
              {!isPr && (
                <Row label="Agent" value={tactic.agent?.name ?? "Unknown"} />
              )}
              {!isPr && (
                <Row label="Model" value={tactic.agent?.model ?? "—"} />
              )}
              <Row
                label="Confidence"
                value={<ConfidenceBadge value={tactic.confidence} />}
              />
              <Row label="Risk level" value={<RiskBadge value={tactic.riskLevel} />} />
              <Row
                label="Attempts"
                value={
                  <AttemptBadge
                    attemptCount={tactic.attemptCount}
                    maxAttempts={tactic.maxAttempts}
                  />
                }
              />
            <Row
              label="Human gate"
              value={tactic.requiresHumanApproval ? "Required" : "Not required"}
            />
            <Row
              label="Source"
              value={
                isPr
                  ? `Pull Request #${tactic.sourceId}`
                  : tactic.source === "inbox"
                  ? "Inbox interrupt"
                  : "Simulated proposal"
              }
            />
            {tactic.prMergeable && (
              <Row label="PR mergeable" value={tactic.prMergeable} />
            )}
          </div>

          {/* Phase 7: Time Tracking */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <TimeTrackingDisplay
              estimated={tactic.estimatedMinutes}
              actual={tactic.actualMinutes}
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Background reviewer</p>
              <LlmReviewButton tacticId={tactic.id} />
            </div>
          </div>
        </div>
      </section>

      {/* Phase 8: Escalation Notice */}
      {tactic.attemptCount >= tactic.maxAttempts &&
        tactic.status !== "completed" &&
        tactic.status !== "rejected" &&
        tactic.status !== "approved" && (
          <EscalationNotice
            tacticId={tactic.id}
            attemptCount={tactic.attemptCount}
            maxAttempts={tactic.maxAttempts}
          />
        )}

      {/* Phase 7: Subtask List */}
      {subtasks.length > 0 || (!isPr) ? (
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <SubtaskList tacticId={tactic.id} subtasks={subtasks} />
        </section>
      ) : null}

      {/* Approval gate: renders for all tactic types when status is needs_review.
          For PR-tactics this provides approve/reject/comment actions (mapped to
          gh pr review). The merge button is separate and only shown for PRs
          with passing CI. */}
      <ApprovalGate tactic={tactic} />

      {isPr && showMergeButton && (
        <PrMergeButton
          tacticId={tactic.id}
          disabled={mergeDisabled}
          disabledReason={mergeDisabledReason}
        />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Conversation
        </h2>
        <MessageThread
          parentType="tactic"
          parentId={tactic.id}
          messages={tactic.messages}
          currentUser={user ?? { id: "", name: "Me" }}
        />
      </section>

      {tactic.approvals.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Decision history
          </h2>
          <ul className="divide-y divide-slate-100">
            {tactic.approvals.map((approval) => (
              <li key={approval.id} className="py-3">
                <p className="text-sm font-medium capitalize text-slate-900 dark:text-slate-100">
                  {approval.decision.replace(/_/g, " ")}
                </p>
                {approval.notes && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{approval.notes}</p>
                )}
                <p className="text-xs text-slate-400">
                  {new Date(approval.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
