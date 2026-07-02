import Link from "next/link";
import { Wrench, ArrowRight } from "lucide-react";
import type { skills } from "@/db/schema";

type SkillRow = {
  skill: typeof skills.$inferSelect;
  agentCount: number;
};

type Props = {
  skills: SkillRow[];
  count: number;
};

export function SkillsPanel({ skills: skillRows, count }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Skills
          </h2>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            {count}
          </span>
        </div>
        <Link
          href="/skills"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-2">
        {skillRows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No skills defined yet.
          </p>
        ) : (
          skillRows.slice(0, 3).map(({ skill, agentCount }) => (
            <div
              key={skill.id}
              className="rounded-xl border border-slate-100 dark:border-slate-800 p-3"
            >
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                {skill.name}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {skill.description && (
                  <span className="truncate">{skill.description}</span>
                )}
                {agentCount > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      {agentCount} agent{agentCount === 1 ? "" : "s"}
                    </span>
                  </>
                )}
              </div>
              {skill.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {skill.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
