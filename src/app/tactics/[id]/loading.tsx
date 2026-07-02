// Loading skeleton for the tactic detail page.
export default function TacticDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Back link */}
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />

      {/* Main card */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-4 w-80 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* CI checks / steps skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-lg bg-slate-50 dark:bg-slate-800"
                  />
                ))}
              </div>
            </div>
            {/* Sources skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-48 animate-pulse rounded bg-slate-50 dark:bg-slate-800" />
            </div>
          </div>

          {/* Assessment sidebar skeleton */}
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 dark:bg-slate-800 p-5">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approval gate / merge button skeleton */}
      <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white dark:bg-slate-900" />

      {/* Conversation skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="h-5 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="h-16 w-64 animate-pulse rounded-2xl bg-slate-50 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
