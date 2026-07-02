import { AlertTriangle, CheckCircle2, Clock, ExternalLink, XCircle, Loader2 } from "lucide-react";

type CiCheck = {
  name: string;
  status: string;
  conclusion: string | null;
  url: string | null;
  workflow: string | null;
};

type Props = {
  checks: CiCheck[];
  failing: number;
  passing: number;
  pending: number;
  state: "passing" | "failing" | "pending" | "none";
};

export function PrCiPanel({ checks, failing, passing, pending, state }: Props) {
  const sorted = [...checks].sort((a, b) => {
    // Failing first, then pending, then passing, then skipped
    const score = (c: CiCheck): number => {
      if (
        c.conclusion === "FAILURE" ||
        c.conclusion === "ERROR" ||
        c.conclusion === "CANCELLED" ||
        c.conclusion === "TIMED_OUT"
      )
        return 0;
      if (
        c.status === "IN_PROGRESS" ||
        c.status === "QUEUED" ||
        c.status === "PENDING" ||
        c.status === "WAITING"
      )
        return 1;
      if (c.conclusion === "SKIPPED" || c.conclusion === "NEUTRAL") return 3;
      return 2; // success
    };
    return score(a) - score(b);
  });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">CI status</h2>
        <StateBadge state={state} failing={failing} pending={pending} passing={passing} />
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">No CI checks configured for this PR.</p>
      ) : (
        <ul role="list" aria-label="CI checks" className="space-y-1.5">
          {sorted.map((c, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-slate-900 px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <StatusIcon check={c} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">{c.name}</p>
                  {c.workflow && (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      workflow: {c.workflow}
                    </p>
                  )}
                </div>
              </div>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View CI run for ${c.name}`}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  view run <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StateBadge({
  state,
  failing,
  pending,
  passing,
}: {
  state: Props["state"];
  failing: number;
  pending: number;
  passing: number;
}) {
  if (state === "failing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
        <XCircle className="h-3.5 w-3.5" /> ✗ {failing} failing
      </span>
    );
  }
  if (state === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
        <Loader2 className="h-3.5 w-3.5" /> {pending} pending
      </span>
    );
  }
  if (state === "passing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> ✓ {passing} passing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600">
      no checks
    </span>
  );
}

function StatusIcon({ check }: { check: CiCheck }) {
  if (
    check.status === "IN_PROGRESS" ||
    check.status === "QUEUED" ||
    check.status === "PENDING" ||
    check.status === "WAITING"
  ) {
    return <Loader2 className="h-4 w-4 shrink-0 text-amber-600" />;
  }
  if (
    check.conclusion === "FAILURE" ||
    check.conclusion === "ERROR" ||
    check.conclusion === "CANCELLED" ||
    check.conclusion === "TIMED_OUT"
  ) {
    return <XCircle className="h-4 w-4 shrink-0 text-rose-600" />;
  }
  if (check.conclusion === "SKIPPED" || check.conclusion === "NEUTRAL") {
    return <Clock className="h-4 w-4 shrink-0 text-slate-400" />;
  }
  if (check.conclusion === "SUCCESS") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  }
  return <AlertTriangle className="h-4 w-4 shrink-0 text-slate-400" />;
}
