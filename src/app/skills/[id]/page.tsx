"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench, Bot, Tag, Edit3, Trash2, ArrowLeft } from "lucide-react";
import { SkillEditor } from "@/components/skill-editor";

type Agent = {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
};

type Skill = {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  agents: Agent[];
};

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const fetchSkill = useCallback(async (skillId: string) => {
    try {
      const res = await fetch(`/api/skills/${skillId}`);
      const data = (await res.json()) as { ok: boolean; data?: Skill };
      if (data.ok && data.data) {
        setSkill(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchSkill(id);
  }, [id, fetchSkill]);

  async function handleDelete() {
    if (!id || !confirm("Delete this skill? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        router.push("/skills");
      } else {
        alert(data.error ?? "Failed to delete skill. Please try again.");
        setDeleting(false);
      }
    } catch {
      alert("Network error — could not delete skill.");
      setDeleting(false);
    }
  }

  function handleUpdated(updated: { id: string; name: string; description: string; content: string; tags: string[] }) {
    setSkill((prev) => (prev ? { ...prev, ...updated } : prev));
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <Wrench className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Skill not found.
        </p>
        <Link
          href="/skills"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Skills
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/skills" className="hover:text-indigo-600">
          Skills
        </Link>
        <span>/</span>
        <span>{skill.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
            <Wrench className="h-6 w-6 text-indigo-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
              {skill.name}
            </h1>
            {skill.description && (
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                {skill.description}
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

      {/* Edit form (inline) */}
      {editing && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Edit Skill
          </h2>
          <SkillEditor
            skill={skill}
            onSave={handleUpdated}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {/* Tags */}
      {!editing && skill.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Tag className="h-4 w-4 text-slate-400" />
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      {!editing && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Prompt Content
          </h2>
          {skill.content ? (
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-800 dark:text-slate-200">
              {skill.content}
            </pre>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No content defined. Add markdown content that will be injected
              into agent prompts when this skill is active.
            </p>
          )}
        </div>
      )}

      {/* Linked Agents */}
      {!editing && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Linked Agents ({skill.agents.length})
            </h2>
          </div>
          {skill.agents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No agents linked to this skill yet. Link agents via the API to
              inject this skill&apos;s content into their prompts.
            </p>
          ) : (
            <div className="space-y-2">
              {skill.agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:border-indigo-200"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-sm">
                    {agent.avatarUrl ?? agent.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {agent.name}
                    </p>
                    <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                      {agent.role}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
