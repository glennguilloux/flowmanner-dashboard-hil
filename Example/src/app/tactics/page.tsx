import Link from "next/link";
import { getTactics } from "@/lib/data";
import { TacticCard } from "@/components/tactic-card";

export const dynamic = "force-dynamic";

export default async function TacticsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const allTactics = await getTactics();
  const filtered = status
    ? allTactics.filter((t) => t.tactic.status === status)
    : allTactics;

  const statuses = [
    { value: "proposed", label: "Proposed" },
    { value: "needs_review", label: "Needs review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "running", label: "Running" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Tactics</h1>
          <p className="text-slate-600">Concrete PR actions proposed by your agents.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterLink active={!status} href="/tactics" label="All" />
          {statuses.map((s) => (
            <FilterLink
              key={s.value}
              active={status === s.value}
              href={`/tactics?status=${s.value}`}
              label={s.label}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(({ tactic, agent }) => (
          <TacticCard key={tactic.id} tactic={tactic} agent={agent} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-slate-500">
            No tactics match this filter.
          </p>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
