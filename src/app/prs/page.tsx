import { getTactics } from "@/lib/data";
import { TacticCard } from "@/components/tactic-card";
import { GitPullRequest } from "lucide-react";
import { RefreshBar } from "@/components/refresh-bar";
import { BatchReviewButton } from "@/components/batch-review-button";

export const dynamic = "force-dynamic";

export default async function PrsPage() {
  const prTactics = await getTactics({ source: "pr" });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
          <GitPullRequest className="h-6 w-6" />
          Pull Requests
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Open PRs on the FM repo, with CI status and a human gate.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <BatchReviewButton />
      </div>

      <RefreshBar />

      <div className="grid gap-4 md:grid-cols-2">
        {prTactics.map(({ tactic, agent }) => (
          <TacticCard key={tactic.id} tactic={tactic} agent={agent} />
        ))}
        {prTactics.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No PRs synced yet. Click <strong>Sync from GitHub</strong> to pull
              the latest open PRs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
