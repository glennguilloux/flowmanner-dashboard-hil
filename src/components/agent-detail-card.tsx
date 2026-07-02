import Link from "next/link";
import {
  Bot,
  Sparkles,
  Wrench,
  Edit3,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { agents, skills as skillsTable } from "@/db/schema";

type Agent = typeof agents.$inferSelect;
type Skill = typeof skillsTable.$inferSelect;

type Props = {
  agent: Agent;
  linkedSkills?: Skill[];
  onEdit?: () => void;
};

export function AgentDetailCard({ agent, linkedSkills, onEdit }: Props) {
  const isActive = agent.status === "active";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-2xl">
            {agent.avatarUrl ?? "🤖"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {agent.name}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {isActive ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {agent.status}
              </span>
            </div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {agent.role}
            </p>
            {agent.description && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {agent.description}
              </p>
            )}
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Edit agent"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Model */}
      {agent.model && (
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Sparkles className="h-3 w-3" />
          {agent.model}
        </div>
      )}

      {/* Capabilities */}
      {agent.capabilities.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Bot className="h-3 w-3" />
            Capabilities
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Linked Skills */}
      {linkedSkills && linkedSkills.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Wrench className="h-3 w-3" />
            Skills ({linkedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {linkedSkills.map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
              >
                {skill.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Instructions preview */}
      {agent.instructions && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Instructions
          </h4>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300 line-clamp-6">
            {agent.instructions}
          </pre>
        </div>
      )}
    </div>
  );
}
