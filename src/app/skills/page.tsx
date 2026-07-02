"use client";

import { useState, useEffect, useCallback } from "react";
import { Wrench, Plus, RefreshCw, Edit3, Trash2, X } from "lucide-react";
import Link from "next/link";
import { SkillEditor } from "@/components/skill-editor";

type Skill = {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
};

type SkillRow = {
  skill: Skill;
  agentCount: number;
};

export default function SkillsPage() {
  const [skillRows, setSkillRows] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      const data = (await res.json()) as { ok: boolean; data: SkillRow[] };
      if (data.ok) setSkillRows(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  async function handleDelete(skillId: string) {
    if (!confirm("Delete this skill? This cannot be undone.")) return;
    setDeleting(skillId);
    try {
      const res = await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        setSkillRows((prev) => prev.filter((r) => r.skill.id !== skillId));
      }
    } finally {
      setDeleting(null);
    }
  }

  function handleCreated(skill: Skill) {
    setSkillRows((prev) => [{ skill, agentCount: 0 }, ...prev]);
    setShowCreate(false);
  }

  function handleUpdated(skill: Skill) {
    setSkillRows((prev) =>
      prev.map((r) => (r.skill.id === skill.id ? { ...r, skill } : r)),
    );
    setEditingSkill(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
            Skills Library
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Reusable skill definitions that can be linked to agents. Content is
            injected into agent prompts when the skill is active.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSkills}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setEditingSkill(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Skill
          </button>
        </div>
      </div>

      {/* Create / Edit form */}
      {(showCreate || editingSkill) && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {editingSkill ? "Edit Skill" : "Create New Skill"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditingSkill(null);
              }}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SkillEditor
            skill={editingSkill ?? undefined}
            onSave={editingSkill ? handleUpdated : handleCreated}
            onCancel={() => {
              setShowCreate(false);
              setEditingSkill(null);
            }}
          />
        </div>
      )}

      {/* Skills list */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : skillRows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-12 shadow-sm text-center">
          <Wrench className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No skills defined yet. Click &quot;New Skill&quot; to create your
            first skill.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skillRows.map(({ skill, agentCount }) => (
            <div
              key={skill.id}
              className="group relative rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              {/* Actions */}
              <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSkill(skill);
                    setShowCreate(false);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  aria-label="Edit skill"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(skill.id)}
                  disabled={deleting === skill.id}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  aria-label="Delete skill"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <Link href={`/skills/${skill.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                    <Wrench
                      className="h-5 w-5 text-indigo-600"
                      aria-hidden="true"
                    />
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
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
