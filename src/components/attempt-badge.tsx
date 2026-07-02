import { RotateCcw } from "lucide-react";

export function AttemptBadge({
  attemptCount,
  maxAttempts,
}: {
  attemptCount: number;
  maxAttempts: number;
}) {
  const pct = maxAttempts > 0 ? attemptCount / maxAttempts : 0;
  const color =
    pct >= 0.9
      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
      : pct >= 0.5
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      <RotateCcw className="h-3 w-3" />
      {attemptCount}/{maxAttempts} attempts
    </span>
  );
}
