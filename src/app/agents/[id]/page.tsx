"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Edit3,
  Trash2,
  Wrench,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Link2,
  Unlink,
} from "lucide-react";
import { AgentEditor } from "@/components/agent-editor";
import type { AgentBase } from "@/components/agent-editor";

type Skill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

type Agent = AgentBase & {
  skills: Skill[];
};

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLinkSkill, setShowLinkSkill] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agents/${id}`);
        const data = (await res.json()) as { ok: boolean; data?: Agent };
        if (data.ok && data.data) setAgent(data.data);
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [id]);

  useEffect(() => {
    async function fetchAllSkills() {
      const res = await fetch("/api/skills");
      const data = (await res.json()) as {
        ok: boolean;
        data: { skill: Skill; agentCount: number }[];
      };
      if (data.ok) setAllSkills(data.data.map((r) => r.skill));
    }
    fetchAllSkills();
  }, []);

  async function handleDelete() {
    if (!id || !confirm("Delete this agent? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        router.push("/agents");
      } else {
        alert(data.error ?? "Failed to delete agent.");
        setDeleting(false);
      }
    } catch {
      alert("Network error — could not delete agent.");
      setDeleting(false);
    }
  }

  function handleUpdated(updated: AgentBase) {
    setAgent((prev) => (prev ? { ...prev, ...updated } : prev));
    setEditing(false);
  }

  async function handleLinkSkill(skillId: string) {
    if (!id) return;
    setLinking(skillId);
    const skill = allSkills.find((s) => s.id === skillId);
    // Optimistic update
    if (skill) {
      setAgent((prev) =>
        prev ? { ...prev, skills: [...prev.skills, skill] } : prev,
      );
    }
    try {
      const res = await fetch(`/api/agents/${id}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        // Revert optimistic update
        setAgent((prev) =>
          prev
            ? { ...prev, skills: prev.skills.filter((s) => s.id !== skillId) }
            : prev,
        );
        alert(data.error ?? "Failed to link skill.");
      }
    } catch {
      // Revert optimistic update
      setAgent((prev) =>
        prev
          ? { ...prev, skills: prev.skills.filter((s) => s.id !== skillId) }
          : prev,
      );
      alert("Network error — could not link skill.");
    } finally {
      setLinking(null);
    }
  }

  async function handleUnlinkSkill(skillId: string) {
    if (!id) return;
    setUnlinking(skillId);
    // Store skill for rollback
    const removedSkill = agent?.skills.find((s) => s.id === skillId);
    // Optimistic update
    setAgent((prev) =>
      prev
        ? { ...prev, skills: prev.skills.filter((s) => s.id !== skillId) }
        : prev,
    );
    try {
      const res = await fetch(`/api/agents/${id}/skills`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        // Revert optimistic update
        if (removedSkill) {
          setAgent((prev) =>
            prev
              ? { ...prev, skills: [...prev.skills, removedSkill] }
              : prev,
          );
        }
        alert(data.error ?? "Failed to unlink skill.");
      }
    } catch {
      // Revert optimistic update
      if (removedSkill) {
        setAgent((prev) =>
          prev
            ? { ...prev, skills: [...prev.skills, removedSkill] }
            : prev,
        );
      }
      alert("Network error — could not unlink skill.");
    } finally {
      setUnlinking(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <Bot className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Agent not found.
        </p>
        <Link
          href="/agents"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Agents
        </Link>
      </div>
    );
  }

  const isActive = agent.status === "active";
  // Skills not yet linked to this agent
  const availableSkills = allSkills.filter(
    (s) => !agent.skills.some((linked) => linked.id === s.id),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/agents" className="hover:text-indigo-600">
          Agents
        </Link>
        <span>/</span>
        <span>{agent.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-3xl">
            {agent.avatarUrl ?? "🤖"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
                {agent.name}
              </h1>
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
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {agent.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Edit Agent
          </h2>
          <AgentEditor
            agent={agent}
            onSave={handleUpdated}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {/* Model & Capabilities */}
      {!editing && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          {agent.model && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="font-medium">Model:</span>
              {agent.model}
            </div>
          )}
          {agent.capabilities.length > 0 && (
            <div className={agent.model ? "mt-4" : ""}>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Bot className="h-3 w-3" />
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Linked Skills — with link/unlink UI */}
      {!editing && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Skills ({agent.skills.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowLinkSkill(!showLinkSkill)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Link Skill
            </button>
          </div>

          {/* Skill picker dropdown */}
          {showLinkSkill && (
            <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Available Skills
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLinkSkill(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {availableSkills.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All skills are already linked to this agent.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      disabled={linking === skill.id}
                      onClick={() => handleLinkSkill(skill.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                    >
                      <Link2 className="h-3 w-3" />
                      {skill.name}
                      {linking === skill.id && (
                        <span className="ml-1 text-xs text-indigo-500">
                          …
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linked skills list */}
          {agent.skills.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No skills linked yet. Click &quot;Link Skill&quot; to add skills
              that will be injected into this agent&apos;s prompts.
            </p>
          ) : (
            <div className="space-y-2">
              {agent.skills.map((skill) => (
                <div
                  key={skill.id}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:border-indigo-200"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/skills/${skill.id}`}
                      className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600"
                    >
                      {skill.name}
                    </Link>
                    {skill.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                        {skill.description}
                      </p>
                    )}
                    {skill.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnlinkSkill(skill.id)}
                    disabled={unlinking === skill.id}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 disabled:opacity-50"
                    aria-label={`Unlink ${skill.name}`}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!editing && agent.instructions && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Instructions
          </h2>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-700 dark:text-slate-300">
            {agent.instructions}
          </pre>
        </div>
      )}
    </div>
  );
}
