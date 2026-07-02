import { getTacticsByQuadrant } from "@/lib/priority-matrix";
import { Grid2x2 } from "lucide-react";
import { PriorityMatrix } from "@/components/priority-matrix";

export const dynamic = "force-dynamic";

export default async function PriorityMatrixPage() {
  const tacticRows = await getTacticsByQuadrant();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Grid2x2 className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
            Eisenhower Priority Matrix
          </h1>
        </div>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Classify tactics by importance and urgency. Click a tactic to reassign
          its quadrant.
        </p>
      </div>

      <PriorityMatrix initialTactics={tacticRows} />
    </div>
  );
}
