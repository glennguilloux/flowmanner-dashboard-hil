import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Network } from "lucide-react";
import { buildDagData } from "@/lib/dag-layout";
import { DagGraph } from "@/components/dag-graph";
import { db } from "@/db";
import { strategies } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const strategy = await db.query.strategies.findFirst({
    where: eq(strategies.id, id),
  });
  if (!strategy) notFound();

  const { nodes, edges } = await buildDagData(id);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/strategies/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to strategy
        </Link>
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-indigo-600" />
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {strategy.title} — DAG
          </h1>
        </div>
      </div>

      {nodes.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
          No tactics in this strategy yet.
        </p>
      ) : (
        <DagGraph initialNodes={nodes} initialEdges={edges} />
      )}
    </div>
  );
}
