// Loading skeleton for the PR list page.
export default function PrsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="mt-4 flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
