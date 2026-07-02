import Link from "next/link";
import { notFound } from "next/navigation";
import { getStrategyWithTactics, getDefaultUser, getAgents } from "@/lib/data";
import { MessageThread } from "@/components/message-thread";
import { TacticCard } from "@/components/tactic-card";
import { SimulateProposal } from "@/components/simulate-proposal";
import { ArrowLeft, Shield } from "lucide-react";

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
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to strategies
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Strategy
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {strategy.title}
            </h1>
          </div>
          <StatusBadge status={strategy.status} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Goal</h2>
              <p className="mt-1 text-slate-700">{strategy.goal}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Rules</h2>
              <p className="mt-1 whitespace-pre-line text-slate-700">{strategy.rules}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Shield className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold">Human gate triggers</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {strategy.humanGateTriggers.split(",").map((trigger, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
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
          <h2 className="text-xl font-semibold text-slate-900">Tactics</h2>
          <span className="text-sm text-slate-500">
            {strategy.tactics.length} proposed
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {strategy.tactics.map(({ tactic, agent }) => (
            <TacticCard key={tactic.id} tactic={tactic} agent={agent} />
          ))}
        </div>
      </section>

      <SimulateProposal strategyId={strategy.id} agents={agents} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Strategy conversation</h2>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
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
