import { Square, ClipboardCheck } from "lucide-react";

export function AcceptanceCriteriaList({
  criteria,
}: {
  criteria: string[];
}) {
  if (!criteria || criteria.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Acceptance Criteria
        </h3>
        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
          {criteria.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {criteria.map((criterion, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 dark:text-slate-300"
          >
            <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            <span>{criterion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
