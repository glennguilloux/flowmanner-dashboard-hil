"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { AgentEditor } from "@/components/agent-editor";

type Skill = {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
};

type Agent = {
  id: string;
  name: string;
  role: string;
  model: string | null;
  avatarUrl: string | null;
  instructions: string | null;
  capabilities: string[];
  status: string;
  icon: string | null;
  description: string | null;
  skills?: Skill[];
};

export default function AgentsPage() {
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = (await res.json()) as { ok: boolean; data: Agent[] };
      if (data.ok) setAgentsList(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  async function handleDelete(agentId: string) {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    setDeleting(agentId);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        setAgentsList((prev) => prev.filter((a) => a.id !== agentId));
      }
    } finally {
      setDeleting(null);
    }
  }

  function handleCreated(agent: Agent) {
    setAgentsList((prev) => [agent, ...prev]);
    setShowCreate(false);
  }

  function handleUpdated(agent: Agent) {
    setAgentsList((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
    setEditingAgent(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
            Agents
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your AI teammates and their roles in the loop. All models run on the
            homelab (no SaaS).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setEditingAgent(null);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Agent
        </button>
      </div>

      {/* Create / Edit form */}
      {(showCreate || editingAgent) && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {editingAgent ? "Edit Agent" : "Create New Agent"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingAgent(null);
              }}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <AgentEditor
            agent={editingAgent ?? undefined}
            onSave={editingAgent ? handleUpdated : handleCreated}
            onCancel={() => {
              setShowCreate(false);
              setEditingAgent(null);
            }}
          />
        </div>
      )}

      {/* Agent cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : agentsList.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-12 shadow-sm text-center">
          <Bot className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No agents yet. Click &quot;New Agent&quot; to register your first
            agent.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agentsList.map((agent) => {
            const isActive = agent.status === "active";
            const isExpanded = expandedId === agent.id;

            return (
              <div
                key={agent.id}
                className="group relative rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
              >
                {/* Actions */}
                <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAgent(agent);
                      setShowCreate(false);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    aria-label="Edit agent"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(agent.id)}
                    disabled={deleting === agent.id}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    aria-label="Delete agent"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-2xl">
                    {agent.avatarUrl ?? "🤖"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {agent.name}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5" />
                        )}
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      {agent.role}
                    </p>
                  </div>
                </div>

                {agent.description && (
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {agent.description}
                  </p>
                )}

                {agent.model && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Sparkles className="h-3 w-3" /> {agent.model}
                  </p>
                )}

                {/* Capabilities */}
                {agent.capabilities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 4).map((cap) => (
                      <span
                        key={cap}
                        className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                      >
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 4 && (
                      <span className="text-[10px] text-slate-400">
                        +{agent.capabilities.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Skills */}
                {agent.skills && agent.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {agent.skills.slice(0, 3).map((skill) => (
                      <Link
                        key={skill.id}
                        href={`/skills/${skill.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        <Wrench className="h-2.5 w-2.5" />
                        {skill.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Expand/collapse instructions */}
                {agent.instructions && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : agent.id)
                    }
                    className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    {isExpanded ? "Hide instructions" : "Show instructions"}
                  </button>
                )}

                {isExpanded && agent.instructions && (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300">
                    {agent.instructions}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Gate design section */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Bot className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold">Gate design</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Low-confidence trigger",
              desc: "Pause and ask when confidence < 70%.",
            },
            {
              title: "Risk detection",
              desc: "Auto-gate high-risk legal/financial/retention claims.",
            },
            {
              title: "Checkpointing",
              desc: "Save state before every human gate for safe rollback.",
            },
            {
              title: "Max attempts",
              desc: "Cap retries at 3; escalate to human if exceeded.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
