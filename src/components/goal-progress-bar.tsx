type Props = {
  progress: number;
};

export function GoalProgressBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(100, progress));

  const barColor =
    clamped >= 70
      ? "bg-emerald-500"
      : clamped >= 30
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
        {clamped}%
      </span>
    </div>
  );
}
