import Link from "next/link";
import { notFound } from "next/navigation";
import { getTacticDetail, getDefaultUser } from "@/lib/data";
import { MessageThread } from "@/components/message-thread";
import { ApprovalGate } from "@/components/approval-gate";
import { ArrowLeft, AlertTriangle, Bot, Target } from "lucide-react";

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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href="/tactics"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tactics
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Target className="h-3.5 w-3.5" />
              Tactic for{" "}
              <Link
                href={`/strategies/${tactic.strategy?.id}`}
                className="text-indigo-600 hover:underline"
              >
                {tactic.strategy?.title ?? "Unknown strategy"}
              </Link>
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {tactic.title}
            </h1>
            <p className="mt-2 text-slate-600">{tactic.description}</p>
          </div>
          <StatusBadge status={tactic.status} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Execution steps</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {tactic.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            {Array.isArray(tactic.sources) && tactic.sources.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Sources</h2>
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
                    )
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
          </div>

          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Bot className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold">Agent assessment</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Agent</span>
                <span className="font-medium text-slate-900">
                  {tactic.agent?.name ?? "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Confidence</span>
                <span
                  className={[
                    "font-medium",
                    tactic.confidence >= 70
                      ? "text-emerald-700"
                      : tactic.confidence >= 40
                      ? "text-amber-700"
                      : "text-rose-700",
                  ].join(" ")}
                >
                  {tactic.confidence}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Risk level</span>
                <span className="font-medium capitalize text-slate-900">
                  {tactic.riskLevel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Attempts</span>
                <span className="font-medium text-slate-900">
                  {tactic.attemptCount} / {tactic.maxAttempts}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Human gate</span>
                <span className="font-medium text-slate-900">
                  {tactic.requiresHumanApproval ? "Required" : "Not required"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ApprovalGate tactic={tactic} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Tactic conversation
        </h2>
        <MessageThread
          parentType="tactic"
          parentId={tactic.id}
          messages={tactic.messages}
          currentUser={user ?? { id: "", name: "Me" }}
        />
      </section>

      {tactic.approvals.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Decision history</h2>
          <ul className="divide-y divide-slate-100">
            {tactic.approvals.map((approval) => (
              <li key={approval.id} className="py-3">
                <p className="text-sm font-medium capitalize text-slate-900">
                  {approval.decision.replace("_", " ")}
                </p>
                {approval.notes && (
                  <p className="text-sm text-slate-600">{approval.notes}</p>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    proposed: "bg-slate-100 text-slate-700",
    needs_review: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    running: "bg-indigo-100 text-indigo-700",
    completed: "bg-sky-100 text-sky-700",
  };
  return (
    <span
      className={[
        "shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize",
        styles[status] ?? "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {status.replace("_", " ")}
    </span>
  );
}
