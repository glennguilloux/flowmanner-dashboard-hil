import { Sidebar } from "@/components/sidebar";

// Global loading skeleton that matches the sidebar + main content layout.
// Shown while server components are streaming via Suspense.
export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header skeleton */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-4 w-72 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200" />
            </div>
          </div>

          {/* Stat cards skeleton */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="mt-3 h-9 w-12 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>

          {/* Executive layer skeleton */}
          <div className="h-3 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 h-48 animate-pulse rounded-2xl border border-slate-200 bg-white dark:bg-slate-900" />
            <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white dark:bg-slate-900" />
          </div>

          {/* Operations layer skeleton */}
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:bg-slate-900" />
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:bg-slate-900" />
          </div>
        </div>
      </main>
    </div>
  );
}
