import Link from "next/link";
import { Wrench, Bot } from "lucide-react";
import type { skills, agents } from "@/db/schema";

type Skill = typeof skills.$inferSelect;
type Agent = typeof agents.$inferSelect;

type Props = {
  skill: Skill;
  agentCount: number;
  agents?: Agent[];
};

export function SkillCard({ skill, agentCount, agents: linkedAgents }: Props) {
  return (
    <Link
      href={`/skills/${skill.id}`}
      className="block rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
          <Wrench className="h-5 w-5 text-indigo-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {skill.name}
          </h3>
          {skill.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
              {skill.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {agentCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
            <Bot className="h-3 w-3" />
            {agentCount} agent{agentCount === 1 ? "" : "s"}
          </span>
        )}
        {skill.tags.length > 0 &&
          skill.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-400"
            >
              {tag}
            </span>
          ))}
      </div>

      {linkedAgents && linkedAgents.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          {linkedAgents.slice(0, 5).map((agent) => (
            <span
              key={agent.id}
              title={agent.name}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]"
            >
              {agent.avatarUrl ?? agent.name.charAt(0)}
            </span>
          ))}
          {linkedAgents.length > 5 && (
            <span className="text-[10px] text-slate-400">
              +{linkedAgents.length - 5}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
