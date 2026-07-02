// Reusable skeleton card for Suspense fallbacks. Matches the rounded-2xl card
// pattern used throughout the dashboard.

export function SkeletonCard({
  className = "",
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
