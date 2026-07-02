import Link from "next/link";
import { getStrategies } from "@/lib/data";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StrategiesPage() {
  const strategies = await getStrategies();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Strategies</h1>
          <p className="text-slate-600">High-level PR goals, rules, and human-gate triggers.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {strategies.map((strategy) => (
          <Link
            key={strategy.id}
            href={`/strategies/${strategy.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700">
                {strategy.title}
              </h2>
              <StatusBadge status={strategy.status} />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{strategy.goal}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {strategy.humanGateTriggers.split(",").map((trigger, i) => (
                <span
                  key={i}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                >
                  {trigger.trim()}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
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
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        styles[status] ?? "bg-slate-100 text-slate-700",
      ].join(" ")}
    >
      {status.replace("_", " ")}
    </span>
  );
}
