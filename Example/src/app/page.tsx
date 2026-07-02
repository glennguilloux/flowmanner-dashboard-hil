import Link from "next/link";
import {
  getStrategies,
  getTactics,
  getDefaultUser,
} from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [strategies, tactics, user] = await Promise.all([
    getStrategies(),
    getTactics(),
    getDefaultUser(),
  ]);

  const pendingTactics = tactics.filter((t) => t.tactic.status === "needs_review");
  const stats = {
    strategies: strategies.length,
    tactics: tactics.length,
    pending: pendingTactics.length,
    agents: 0,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-950">PR Ops Dashboard</h1>
        <p className="text-slate-600">
          Coordinate strategies, review agent tactics, and keep every high-risk
          decision in your hands.
        </p>
      </header>

      {!user && (
        <SeedBanner />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active strategies"
          value={stats.strategies}
          icon={<Target className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          label="Total tactics"
          value={stats.tactics}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          label="Awaiting approval"
          value={stats.pending}
          icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
          accent={stats.pending > 0}
        />
        <StatCard
          label="Agents"
          value={stats.agents}          icon={<Clock className="h-5 w-5 text-sky-600" />} />

      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Strategies</h2>
            <Link
              href="/strategies"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {strategies.length === 0 && (
              <p className="text-sm text-slate-500">No strategies yet.</p>
            )}
            {strategies.slice(0, 5).map((strategy) => (
              <Link
                key={strategy.id}
                href={`/strategies/${strategy.id}`}
                className="block rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{strategy.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {strategy.goal}
                    </p>
                  </div>
                  <StatusBadge status={strategy.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Needs your review</h2>
            <Link
              href="/tactics?status=needs_review"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Review all
            </Link>
          </div>
          <div className="space-y-3">
            {pendingTactics.length === 0 && (
              <p className="text-sm text-slate-500">Nothing pending. You are caught up.</p>
            )}
            {pendingTactics.slice(0, 5).map((t) => (
              <Link
                key={t.tactic.id}
                href={`/tactics/${t.tactic.id}`}
                className="block rounded-xl border border-amber-100 bg-amber-50/50 p-4 transition-colors hover:border-amber-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{t.tactic.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {t.agent?.name ?? "Agent"} · Confidence {t.tactic.confidence}%
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                    {t.tactic.riskLevel} risk
                  </span>
                </div>
                {t.tactic.uncertaintyNotes && (
                  <p className="mt-2 text-xs text-slate-500">
                    {t.tactic.uncertaintyNotes}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent tactics</h2>
        <div className="divide-y divide-slate-100">
          {tactics.slice(0, 6).map((t) => (
            <div
              key={t.tactic.id}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div>
                <Link
                  href={`/tactics/${t.tactic.id}`}
                  className="font-medium text-slate-900 hover:text-indigo-600"
                >
                  {t.tactic.title}
                </Link>
                <p className="text-sm text-slate-500">
                  {t.strategy?.title ?? "Unknown strategy"} ·{" "}
                  {t.agent?.name ?? "Agent"} ·{" "}
                  {formatDistanceToNow(new Date(t.tactic.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <StatusBadge status={t.tactic.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-white p-5 shadow-sm",
        accent ? "border-amber-200" : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div
          className={[
            "rounded-lg p-2",
            accent ? "bg-amber-100" : "bg-slate-100",
          ].join(" ")}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    completed: "bg-sky-100 text-sky-700",
    proposed: "bg-slate-100 text-slate-700",
    needs_review: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    running: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span
      className={[
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        styles[status] ?? "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function SeedBanner() {
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
      <p className="text-sm text-indigo-900">
        Database is empty. Run the seed endpoint to load demo strategies,
        agents, and tactics.
      </p>
    </div>
  );
}
