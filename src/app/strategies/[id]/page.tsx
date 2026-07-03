import Link from "next/link";
import { notFound } from "next/navigation";
import { getStrategyWithTactics, getDefaultUser, getAgents } from "@/lib/data";
import { MessageThread } from "@/components/message-thread";
import { TacticCard } from "@/components/tactic-card";
import { SimulateProposal } from "@/components/simulate-proposal";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft, Shield, Network } from "lucide-react";
import { StrategyExportImport } from "@/components/strategy-export-import";

export const dynamic = "force-dynamic";

export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const strategy = await getStrategyWithTactics(id);
  const user = await getDefaultUser();
  const agents = await getAgents();

  if (!strategy) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href="/strategies"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to strategies
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Strategy
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">
              {strategy.title}
            </h1>
          </div>
          <StatusBadge status={strategy.status} kind="strategy" />
        </div>

        {/* Phase 3+4: Export/Import + DAG link */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/strategies/${id}/dag`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
          >
            <Network className="h-4 w-4" /> View DAG
          </Link>
          <StrategyExportImport strategyId={id} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Goal</h2>
              <p className="mt-1 text-slate-700">{strategy.goal}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Rules</h2>
              <p className="mt-1 whitespace-pre-line text-slate-700">
                {strategy.rules}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-800 p-5">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Shield className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold">Human gate triggers</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {strategy.humanGateTriggers
                .split(",")
                .map((trigger, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    {trigger.trim()}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tactics</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {strategy.tactics.length} proposed
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {strategy.tactics.map(({ tactic, agent }) => (
            <TacticCard key={tactic.id} tactic={tactic} agent={agent} />
          ))}
          {strategy.tactics.length === 0 && (
            <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
              No tactics yet for this strategy.
            </p>
          )}
        </div>
      </section>

      {agents.length > 0 && (
        <SimulateProposal strategyId={strategy.id} agents={agents} />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Strategy conversation
        </h2>
        <MessageThread
          parentType="strategy"
          parentId={strategy.id}
          messages={strategy.messages}
          currentUser={user ?? { id: "", name: "Me" }}
        />
      </section>
    </div>
  );
}