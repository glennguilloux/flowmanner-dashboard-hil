import Link from "next/link";
import { Lock, Unlock, ArrowRight, ArrowLeft } from "lucide-react";

type Dep = { id: string; title: string; status: string };

export function DependencyBadge({
  blockers,
  blocked,
}: {
  blockers: Dep[];
  blocked: Dep[];
}) {
  const hasBlockers = blockers.length > 0;
  const hasBlocked = blocked.length > 0;

  if (!hasBlockers && !hasBlocked) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Dependencies
      </h3>

      {hasBlockers && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Lock className="h-3.5 w-3.5" />
            Blocked by ({blockers.length})
          </div>
          <ul className="space-y-1">
            {blockers.map((dep) => (
              <li key={dep.id}>
                <Link
                  href={`/tactics/${dep.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600"
                >
                  <ArrowLeft className="h-3 w-3 shrink-0 text-amber-500" />
                  <span className="truncate">{dep.title}</span>
                  <span
                    className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      dep.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : dep.status === "approved" || dep.status === "running"
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {dep.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasBlocked && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
            <Unlock className="h-3.5 w-3.5" />
            Blocking ({blocked.length})
          </div>
          <ul className="space-y-1">
            {blocked.map((dep) => (
              <li key={dep.id}>
                <Link
                  href={`/tactics/${dep.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-indigo-600"
                >
                  <ArrowRight className="h-3 w-3 shrink-0 text-sky-500" />
                  <span className="truncate">{dep.title}</span>
                  <span
                    className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      dep.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : dep.status === "approved" || dep.status === "running"
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {dep.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
