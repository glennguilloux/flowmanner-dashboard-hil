import Link from "next/link";
import { getTactics } from "@/lib/data";
import type { tactics } from "@/db/schema";
import { TacticCard } from "@/components/tactic-card";
import { BatchReviewButton } from "@/components/batch-review-button";
import { RefreshBar } from "@/components/refresh-bar";

export const dynamic = "force-dynamic";

export default async function TacticsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filtered = await getTactics(
    status ? { status: status as typeof tactics.$inferSelect.status } : undefined,
  );

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
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">Tactics</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Concrete actions proposed by your agents.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BatchReviewButton />
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

      <RefreshBar />

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(({ tactic, agent }) => (
          <TacticCard key={tactic.id} tactic={tactic} agent={agent} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
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
          : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
