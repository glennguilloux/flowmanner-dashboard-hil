import { getAgents } from "@/lib/data";
import { Bot, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">Agents</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Your AI teammates and their roles in the loop. All models run on the
          homelab (no SaaS).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-2xl">
              {agent.avatarUrl ?? "🤖"}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {agent.name}
            </h2>
            <p className="text-sm font-medium text-indigo-600">{agent.role}</p>
            {agent.model && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3 w-3" /> {agent.model}
              </p>
            )}
          </div>
        ))}
        {agents.length === 0 && (
          <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">
            No agents yet — load demo data from the dashboard.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Bot className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold">Gate design</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Low-confidence trigger", desc: "Pause and ask when confidence < 70%." },
            { title: "Risk detection", desc: "Auto-gate high-risk legal/financial/retention claims." },
            { title: "Checkpointing", desc: "Save state before every human gate for safe rollback." },
            { title: "Max attempts", desc: "Cap retries at 3; escalate to human if exceeded." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}